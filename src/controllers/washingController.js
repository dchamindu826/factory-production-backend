// src/controllers/washingController.js
const db = require('../config/db');

// Add New Washing Entry
exports.addWashingEntry = async (req, res) => {
  const { date, styleNumber, washCategory, quantity } = req.body;
  const entered_by_user_id = req.user.id;

  if (!date || !styleNumber || !washCategory || !quantity) {
    return res.status(400).json({ message: 'Date, Style Number, Wash Category, and Quantity are required.' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  const validCategories = ['BEFORE_WASH', 'AFTER_WASH', 'FINISH'];
  if (!validCategories.includes(washCategory)) {
      return res.status(400).json({ message: 'Invalid Wash Category specified.' });
  }

  try {
    const query = `
      INSERT INTO washing_entries
        (entry_date, style_number, wash_category, quantity, status, entered_by_user_id, entry_timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [date, styleNumber, washCategory, parseInt(quantity), 'PENDING', entered_by_user_id];
    const result = await db.query(query, values);
    res.status(201).json({
      message: 'Washing entry added successfully and awaiting approval.',
      washingEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding washing entry:', error);
    if (error.code === '23514') {
        return res.status(400).json({ message: `Invalid data provided. Error: ${error.detail || error.message}` });
    }
    res.status(500).json({ message: 'Server error adding washing entry.' });
  }
};

// Get all PENDING Washing Entries (Admin only)
exports.getPendingWashing = async (req, res) => {
  try {
    const query = `
        SELECT w.*, u.username as entered_by_username
        FROM washing_entries w
        JOIN users u ON w.entered_by_user_id = u.id
        WHERE w.status = 'PENDING'
        ORDER BY w.entry_timestamp DESC;
        `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching pending washing entries:', error);
    res.status(500).json({ message: 'Server error fetching pending washing entries.' });
  }
};

// Approve a Washing Entry (Admin only)
exports.approveWashing = async (req, res) => {
  const entryId = req.params.id;
  const adminUserId = req.user.id;

  if (!entryId) {
      return res.status(400).json({ message: 'Washing entry ID is required.' });
  }
  try {
    const query = `
      UPDATE washing_entries
      SET status = 'APPROVED',
          approved_by_user_id = $1,
          approval_timestamp = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *;
    `;
    const values = [adminUserId, entryId];
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending washing entry not found or already processed.' });
    }
    res.status(200).json({
      message: 'Washing entry approved successfully.',
      approvedEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving washing entry:', error);
    res.status(500).json({ message: 'Server error approving washing entry.' });
  }
};

// Reject a Washing Entry (Admin only)
exports.rejectWashing = async (req, res) => {
    const entryId = req.params.id;
    const adminUserId = req.user.id;

    if (!entryId) {
        return res.status(400).json({ message: 'Washing entry ID is required.' });
    }
    try {
      const query = `
        UPDATE washing_entries
        SET status = 'REJECTED',
            approved_by_user_id = $1,
            approval_timestamp = NOW()
        WHERE id = $2 AND status = 'PENDING'
        RETURNING *;
      `;
      const values = [adminUserId, entryId];
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending washing entry not found or already processed.' });
      }
      res.status(200).json({
        message: 'Washing entry rejected successfully.',
        rejectedEntry: result.rows[0]
      });
    } catch (error) {
      console.error('Error rejecting washing entry:', error);
      res.status(500).json({ message: 'Server error rejecting washing entry.' });
    }
};

// GET APPROVED Washing Entries within a date range
exports.getApprovedWashingForReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Both startDate and endDate are required for the report.' });
  }
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'Start date cannot be after end date.' });
  }

  try {
    const reportQuery = `
      SELECT
        w.id,
        w.entry_date,
        w.style_number,
        w.wash_category,
        w.quantity,
        w.status,
        u_entered.username AS entered_by_username,
        w.entry_timestamp,
        u_approved.username AS approved_by_username,
        w.approval_timestamp
      FROM
        washing_entries w
      JOIN
        users u_entered ON w.entered_by_user_id = u_entered.id
      LEFT JOIN
        users u_approved ON w.approved_by_user_id = u_approved.id
      WHERE
        w.status = 'APPROVED'
        AND w.entry_date >= $1
        AND w.entry_date <= $2
      ORDER BY
        w.entry_date DESC, w.id DESC;
    `;
    const values = [startDate, endDate];
    const result = await db.query(reportQuery, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching approved washing entries for report:', error);
    res.status(500).json({ message: 'Server error fetching washing report data.' });
  }
};
