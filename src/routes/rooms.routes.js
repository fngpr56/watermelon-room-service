import express from 'express';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
} from '../controllers/rooms.controller.js';

const router = express.Router();

router.get('/', getRooms);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;