// src/controllers/gatePassController.js
const db = require('../config/db');

// Add New Gate Pass Entry
exports.addGatePassEntry = async (req, res) => {
  const { date, styleNumber, destination, quantity } = req.body;
  const entered_by_user_id = req.user.id; // Assuming req.user is set by auth middleware

  // Basic validation
  if (!date || !styleNumber || !destination || !quantity) {
    return res.status(400).json({ message: 'Date, Style Number, Destination, and Quantity are required.' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  // Optional: Add more specific validation for destination if needed, though DB constraint handles it

  try {
    // TODO: Stock deduction logic should ideally be handled when an Admin APPROVES the Gate Pass,
    // not at the point of initial entry. This ensures stock is only affected by confirmed shipments.
    const query = `
      INSERT INTO gate_pass_entries
        (entry_date, style_number, destination, quantity, status, entered_by_user_id, entry_timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [date, styleNumber, destination, parseInt(quantity), 'PENDING', entered_by_user_id];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Gate Pass entry added successfully and awaiting approval.',
      gatePassEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding Gate Pass entry:', error);
    if (error.code === '23514') { // Check constraint violation (e.g., invalid destination)
        return res.status(400).json({ message: `Invalid data provided. Error: ${error.detail || error.message}` });
    }
    res.status(500).json({ message: 'Server error adding Gate Pass entry.' });
  }
};

// Get all PENDING Gate Pass Entries (Admin only)
exports.getPendingGatePasses = async (req, res) => {
  try {
    const query = `
        SELECT gp.id,
               gp.entry_date,
               gp.style_number,
               gp.destination,
               gp.quantity,
               gp.status,
               u.username as entered_by_username,
               gp.entry_timestamp
        FROM gate_pass_entries gp
        JOIN users u ON gp.entered_by_user_id = u.id
        WHERE gp.status = 'PENDING'
        ORDER BY gp.entry_timestamp DESC;
        `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching pending gate pass entries:', error);
    res.status(500).json({ message: 'Server error fetching pending gate pass entries.' });
  }
};

// Approve a Gate Pass Entry (Admin only)
exports.approveGatePass = async (req, res) => {
  const entryId = req.params.id;
  const adminUserId = req.user.id;

  if (!entryId) {
      return res.status(400).json({ message: 'Gate Pass entry ID is required.' });
  }

  // --- IMPORTANT: Future Enhancement ---
  // When a Gate Pass is approved, the quantity of the style_number should be deducted
  // from a stock/inventory table. This should be done within a database transaction
  // to ensure data consistency (i.e., if stock deduction fails, the approval should also fail/rollback).
  // For now, we are only updating the status.
  // ---

  try {
    const query = `
      UPDATE gate_pass_entries
      SET status = 'APPROVED',
          approved_by_user_id = $1,
          approval_timestamp = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *;
    `;
    const values = [adminUserId, entryId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending gate pass entry not found or already processed.' });
    }

    // TODO: If stock update logic was added above and it failed, handle the error
    // (maybe rollback the status update or log a critical error).

    res.status(200).json({
      message: 'Gate Pass entry approved successfully.',
      approvedEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error approving gate pass entry:', error);
    res.status(500).json({ message: 'Server error approving gate pass entry.' });
  }
};

// Reject a Gate Pass Entry (Admin only)
exports.rejectGatePass = async (req, res) => {
    const entryId = req.params.id;
    const adminUserId = req.user.id;

    if (!entryId) {
        return res.status(400).json({ message: 'Gate Pass entry ID is required.' });
    }

    try {
      const query = `
        UPDATE gate_pass_entries
        SET status = 'REJECTED',
            approved_by_user_id = $1, 
            approval_timestamp = NOW()
        WHERE id = $2 AND status = 'PENDING'
        RETURNING *;
      `;
      const values = [adminUserId, entryId];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending gate pass entry not found or already processed.' });
      }
      res.status(200).json({
        message: 'Gate Pass entry rejected successfully.',
        rejectedEntry: result.rows[0]
      });
    } catch (error) {
      console.error('Error rejecting gate pass entry:', error);
      res.status(500).json({ message: 'Server error rejecting gate pass entry.' });
    }
};

// GET APPROVED Gate Pass Entries within a date range
exports.getApprovedGatePassesForReport = async (req, res) => {
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
        gp.id,
        gp.entry_date,
        gp.style_number,
        gp.destination,
        gp.quantity,
        gp.status,
        u_entered.username AS entered_by_username,
        gp.entry_timestamp,
        u_approved.username AS approved_by_username,
        gp.approval_timestamp
      FROM
        gate_pass_entries gp
      JOIN
        users u_entered ON gp.entered_by_user_id = u_entered.id
      LEFT JOIN
        users u_approved ON gp.approved_by_user_id = u_approved.id
      WHERE
        gp.status = 'APPROVED'
        AND gp.entry_date >= $1
        AND gp.entry_date <= $2
      ORDER BY
        gp.entry_date DESC, gp.id DESC;
    `;
    const values = [startDate, endDate];
    const result = await db.query(reportQuery, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching approved gate pass entries for report:', error);
    res.status(500).json({ message: 'Server error fetching gate pass report data.' });
  }
};
