// src/controllers/bulkInputController.js
const db = require('../config/db');

// Add New Bulk Input
exports.addBulkInput = async (req, res) => {
  const { date, styleNumber, quantity, supplier } = req.body;
  const entered_by_user_id = req.user.id; // Assuming req.user is set by auth middleware

  if (!date || !styleNumber || !quantity || !supplier) {
    return res.status(400).json({ message: 'Date, Style Number, Quantity, and Supplier are required.' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  if (!['CIB', 'G_FLOCK'].includes(supplier)) {
      return res.status(400).json({ message: 'Invalid supplier specified. Must be CIB or G_FLOCK.' });
  }

  try {
    const query = `
      INSERT INTO bulk_inputs
        (entry_date, style_number, quantity, supplier, status, entered_by_user_id, entry_timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [date, styleNumber, parseInt(quantity), supplier, 'PENDING', entered_by_user_id];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Bulk input added successfully and awaiting approval.',
      bulkInput: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding bulk input:', error);
    if (error.code === '23514') {
        return res.status(400).json({ message: `Invalid data provided. Error: ${error.detail || error.message}` });
    }
    res.status(500).json({ message: 'Server error adding bulk input.' });
  }
};

// Get all PENDING Bulk Inputs (Admin only)
exports.getPendingBulkInputs = async (req, res) => {
  try {
    const query = `
        SELECT bi.id, 
               bi.entry_date, 
               bi.style_number, 
               bi.quantity, 
               bi.supplier, 
               bi.status, 
               u.username as entered_by_username, 
               bi.entry_timestamp
        FROM bulk_inputs bi
        JOIN users u ON bi.entered_by_user_id = u.id
        WHERE bi.status = 'PENDING'
        ORDER BY bi.entry_timestamp DESC;
        `;
    const result = await db.query(query);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching pending bulk inputs:', error);
    res.status(500).json({ message: 'Server error fetching pending bulk inputs.' });
  }
};

// Approve a Bulk Input (Admin only)
exports.approveBulkInput = async (req, res) => {
  const entryId = req.params.id;
  const adminUserId = req.user.id;

  if (!entryId) {
      return res.status(400).json({ message: 'Bulk Input entry ID is required.' });
  }

  try {
    const query = `
      UPDATE bulk_inputs
      SET status = 'APPROVED',
          approved_by_user_id = $1,
          approval_timestamp = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *;
    `;
    const values = [adminUserId, entryId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending bulk input entry not found or already processed.' });
    }

    res.status(200).json({
      message: 'Bulk input approved successfully.',
      approvedEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error approving bulk input:', error);
    res.status(500).json({ message: 'Server error approving bulk input.' });
  }
};

// Reject a Bulk Input (Admin only)
exports.rejectBulkInput = async (req, res) => {
    const entryId = req.params.id;
    const adminUserId = req.user.id;

    if (!entryId) {
        return res.status(400).json({ message: 'Bulk Input entry ID is required.' });
    }

    try {
      const query = `
        UPDATE bulk_inputs
        SET status = 'REJECTED',
            approved_by_user_id = $1,
            approval_timestamp = NOW()
        WHERE id = $2 AND status = 'PENDING'
        RETURNING *;
      `;
      const values = [adminUserId, entryId];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending bulk input entry not found or already processed.' });
      }

      res.status(200).json({
        message: 'Bulk input rejected successfully.',
        rejectedEntry: result.rows[0]
      });

    } catch (error) {
      console.error('Error rejecting bulk input:', error);
      res.status(500).json({ message: 'Server error rejecting bulk input.' });
    }
};

// GET APPROVED Bulk Inputs within a date range (Admin or authorized role)
exports.getApprovedBulkInputsForReport = async (req, res) => {
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
        bi.id,
        bi.entry_date,
        bi.style_number,
        bi.quantity,
        bi.supplier,
        bi.status,
        u_entered.username AS entered_by_username,
        bi.entry_timestamp,
        u_approved.username AS approved_by_username,
        bi.approval_timestamp
      FROM
        bulk_inputs bi
      JOIN
        users u_entered ON bi.entered_by_user_id = u_entered.id
      LEFT JOIN
        users u_approved ON bi.approved_by_user_id = u_approved.id
      WHERE
        bi.status = 'APPROVED'
        AND bi.entry_date >= $1
        AND bi.entry_date <= $2
      ORDER BY
        bi.entry_date DESC, bi.id DESC;
    `;
    const values = [startDate, endDate];
    const result = await db.query(reportQuery, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching approved bulk inputs for report:', error);
    res.status(500).json({ message: 'Server error fetching report data for bulk inputs.' });
  }
};
