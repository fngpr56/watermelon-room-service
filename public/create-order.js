function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU";
  speechSynthesis.speak(u);
}

window.addEventListener("botpress:response", (event) => {
    const { response, text } = event.detail;

  let parsed;

  
  try {
      parsed = JSON.parse(response.text)
  } catch (e) {
    console.log("❌ не удалось распарсить JSON");
    return;
  }

  // 🔥 вызываем проверку
  checkItemsFromMessage(parsed, text);
});

async function checkItemsFromMessage(botData, rawText) {
  let isSuitable = false;

  try {
    const res = await fetch("http://localhost:3000/api/inventory");
    const data = await res.json();

    const inventoryItems = data.items;

    console.log("📦 inventory:", inventoryItems);

    // нормализация названий
    const normalize = (str) =>
      str.toLowerCase().trim();

    inventoryItems.forEach(invItem => {
      console.log("—", invItem.name);
    });

    console.log(botData);
    botData.items.forEach(orderItem => {
      const orderName = normalize(orderItem.product);

      const match = inventoryItems.find(invItem =>
        normalize(invItem.name).includes(orderName) ||
        orderName.includes(normalize(invItem.name))
      );

      if (match) {
        isSuitable = true;
      } else {
        speak("Не найдено");
      }
    });
    if (isSuitable) {
        createRequest(botData, rawText, inventoryItems);
    }

  } catch (err) {
    console.error("❌ error:", err);
  }

}

async function createRequest(botData, rawText, inventory) {
  try {

   const normalize = (s) => s.toLowerCase().trim();

    for (const orderItem of botData.items) {
        const orderName = normalize(orderItem.product);
        const qty = Number(orderItem.quantity);

        const match = inventory.find(inv =>
        normalize(inv.name).includes(orderName) ||
        orderName.includes(normalize(inv.name))
        );

        const newReserved = match.quantityReserved + orderItem.quantity;

        if (newReserved > match.quantityInStock) {
        speak("Недостаточно количества");
        return;
        }
    }

    const mysqlDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

    const payload = {
      roomId: Number(botData.room),
      staffId: null,
      fullRequest: botData.items
        .map(i => `${i.quantity} ${i.product}`)
        .join(", "),
      category: "room_service",
      statusId: 1,
      notes: rawText,
      requestDate: mysqlDate,
      completeDate: null
    };

    const res = await fetch("http://localhost:3000/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    speak("Запрос отправлен");

    await reserveInventory(botData.items);

  } catch (err) {
    speak("Ошибка запроса");
    console.log(err);
  }
}

async function reserveInventory(items) {
  const res = await fetch("http://localhost:3000/api/inventory");
  const data = await res.json();

  const inventory = data.items;

  const normalize = (s) => s.toLowerCase().trim();

  for (const orderItem of items) {
    const orderName = normalize(orderItem.product);
    const qty = Number(orderItem.quantity);

    const match = inventory.find(inv =>
      normalize(inv.name).includes(orderName) ||
      orderName.includes(normalize(inv.name))
    );

    const newReserved = match.quantityReserved + orderItem.quantity;

    await fetch(`http://localhost:3000/api/inventory/${match.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: orderItem.name,
        category: orderItem.category,
        unit: orderItem.unit,
        quantityInStock: orderItem.quantityInStock,
        quantityReserved: newReserved,
        lowStockThreshold: orderItem.lowStockThreshold
      })
    });
  }
}