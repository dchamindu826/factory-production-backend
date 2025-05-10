// src/controllers/specialNotesController.js
const db = require('../config/db');

// Add a new special note (Admin only)
exports.addSpecialNote = async (req, res) => {
  const { note_date, note_content } = req.body;
  const entered_by_user_id = req.user.id; // From protect middleware

  if (!note_content) {
    return res.status(400).json({ message: 'Note content is required.' });
  }
  // Use today's date if note_date is not provided
  const final_note_date = note_date || new Date().toISOString().slice(0,10);

  try {
    const query = `
      INSERT INTO special_notes (note_date, note_content, entered_by_user_id)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const values = [final_note_date, note_content, entered_by_user_id];
    const result = await db.query(query, values);
    res.status(201).json({ message: 'Special note added successfully.', note: result.rows[0] });
  } catch (error) {
    console.error('Error adding special note:', error);
    res.status(500).json({ message: 'Server error adding special note.' });
  }
};

// Get all active special notes (Admin only or for display)
exports.getActiveSpecialNotes = async (req, res) => {
  try {
    // Fetch notes, perhaps the latest N notes, ordered by date
    const query = `
      SELECT sn.id, sn.note_date, sn.note_content, u.username AS entered_by_username, sn.created_at
      FROM special_notes sn
      JOIN users u ON sn.entered_by_user_id = u.id
      WHERE sn.is_active = TRUE
      ORDER BY sn.note_date DESC, sn.created_at DESC
      LIMIT 20; -- Example: Get latest 20 notes
    `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching special notes:', error);
    res.status(500).json({ message: 'Server error fetching special notes.' });
  }
};

// Optional: Delete/Deactivate a special note (Admin only)
exports.deactivateSpecialNote = async (req, res) => {
    const noteId = req.params.id;
    // const adminUserId = req.user.id; // To log who deactivated

    if (!noteId) {
        return res.status(400).json({ message: 'Note ID is required.' });
    }
    try {
        // Instead of deleting, we'll set is_active to false (soft delete)
        const query = `UPDATE special_notes SET is_active = FALSE WHERE id = $1 RETURNING id;`;
        const result = await db.query(query, [noteId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Note not found.' });
        }
        res.status(200).json({ message: 'Special note deactivated successfully.', noteId: result.rows[0].id });
    } catch (error) {
        console.error('Error deactivating special note:', error);
        res.status(500).json({ message: 'Server error deactivating special note.' });
    }
};
