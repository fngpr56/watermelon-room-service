import db from '../config/db.js';

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management API
 */

/**
 * Get all rooms or a single room by id
 * GET /api/rooms?id=1
 *
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms or one room by id
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   room_number:
 *                     type: integer
 *                   password_hash:
 *                     type: string
 *                   owner:
 *                     type: string
 *                   dateIn:
 *                     type: string
 *                   dateOut:
 *                     type: string
 */
export const getRooms = async (req, res, next) => {
  let conn;

  try {
    const { id } = req.query;

    conn = await db.getConnection();

    let sql = 'SELECT * FROM rooms';
    let params = [];

    if (id) {
      sql += ' WHERE id = ?';
      params.push(id);
    }

    const rows = await conn.query(sql, params);

    res.json(id ? rows[0] || {} : rows);
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
};


/**
 * Create a new room
 * POST /api/rooms
 *
*
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room_number
 *               - password_hash
 *             properties:
 *               room_number:
 *                 type: integer
 *               password_hash:
 *                 type: string
 *               owner:
 *                 type: string
 *               dateIn:
 *                 type: string
 *                 format: date-time
 *               dateOut:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Room created
 */
export const createRoom = async (req, res, next) => {
  let conn;

  try {
    const { room_number, password_hash, owner, dateIn, dateOut } = req.body;

    conn = await db.getConnection();

    const result = await conn.query(
      `INSERT INTO rooms (room_number, password_hash, owner, dateIn, dateOut)
       VALUES (?, ?, ?, ?, ?)`,
      [room_number, password_hash, owner, dateIn, dateOut]
    );

    res.status(201).json({
      message: 'Room created',
      id: result.insertId
    });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
};


/**
 * Update room by id
 * PUT /api/rooms/:id
 *
 *
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update room by id
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_number:
 *                 type: integer
 *               password_hash:
 *                 type: string
 *               owner:
 *                 type: string
 *               dateIn:
 *                 type: string
 *               dateOut:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room updated
 */
export const updateRoom = async (req, res, next) => {
  let conn;

  try {
    const { id } = req.params;
    const { room_number, password_hash, owner, dateIn, dateOut } = req.body;

    conn = await db.getConnection();

    await conn.query(
      `UPDATE rooms 
       SET room_number = ?, password_hash = ?, owner = ?, dateIn = ?, dateOut = ?
       WHERE id = ?`,
      [room_number, password_hash, owner, dateIn, dateOut, id]
    );

    res.json({ message: 'Room updated' });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
};


/**
 * Delete room by id
 * DELETE /api/rooms/:id
 *
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete room by id
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room deleted
 */
export const deleteRoom = async (req, res, next) => {
  let conn;

  try {
    const { id } = req.params;

    conn = await db.getConnection();

    await conn.query(
      'DELETE FROM rooms WHERE id = ?',
      [id]
    );

    res.json({ message: 'Room deleted' });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
};