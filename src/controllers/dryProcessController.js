// src/controllers/dryProcessController.js
const db = require('../config/db');

// Add New Dry Process Entry
exports.addDryProcessEntry = async (req, res) => {
  const { date, styleNumber, processName, quantity } = req.body;
  const entered_by_user_id = req.user.id; // Assuming req.user is set by auth middleware

  // Basic validation
  if (!date || !styleNumber || !processName || !quantity) {
    return res.status(400).json({ message: 'Date, Style Number, Process Name, and Quantity are required.' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  // Optional: Add more specific validation for processName if needed, though DB constraint handles it
  // const validProcesses = ['HAND_SHINE', 'WHISKER', ...];
  // if (!validProcesses.includes(processName)) {
  //   return res.status(400).json({ message: 'Invalid process name.' });
  // }

  try {
    const query = `
      INSERT INTO dry_process_entries
        (entry_date, style_number, process_name, quantity, status, entered_by_user_id, entry_timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const values = [date, styleNumber, processName, parseInt(quantity), 'PENDING', entered_by_user_id];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Dry process entry added successfully and awaiting approval.',
      dryProcessEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding dry process entry:', error);
    if (error.code === '23514') { // Check constraint violation (e.g., invalid process_name)
        return res.status(400).json({ message: `Invalid data provided. Error: ${error.detail || error.message}` });
    }
    res.status(500).json({ message: 'Server error adding dry process entry.' });
  }
};

// Get all PENDING Dry Process Entries (Admin only)
exports.getPendingDryProcess = async (req, res) => {
  try {
    const query = `
        SELECT dp.id,
               dp.entry_date,
               dp.style_number,
               dp.process_name,
               dp.quantity,
               dp.status,
               u.username as entered_by_username,
               dp.entry_timestamp
        FROM dry_process_entries dp
        JOIN users u ON dp.entered_by_user_id = u.id
        WHERE dp.status = 'PENDING'
        ORDER BY dp.entry_timestamp DESC;
        `;
    const result = await db.query(query);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching pending dry process entries:', error);
    res.status(500).json({ message: 'Server error fetching pending dry process entries.' });
  }
};

// Approve a Dry Process Entry (Admin only)
exports.approveDryProcess = async (req, res) => {
  const entryId = req.params.id;
  const adminUserId = req.user.id;

  if (!entryId) {
      return res.status(400).json({ message: 'Dry Process entry ID is required.' });
  }

  try {
    const query = `
      UPDATE dry_process_entries
      SET status = 'APPROVED',
          approved_by_user_id = $1,
          approval_timestamp = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *;
    `;
    const values = [adminUserId, entryId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending dry process entry not found or already processed.' });
    }

    res.status(200).json({
      message: 'Dry process entry approved successfully.',
      approvedEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error approving dry process entry:', error);
    res.status(500).json({ message: 'Server error approving dry process entry.' });
  }
};

// Reject a Dry Process Entry (Admin only)
exports.rejectDryProcess = async (req, res) => {
    const entryId = req.params.id;
    const adminUserId = req.user.id;

    if (!entryId) {
        return res.status(400).json({ message: 'Dry Process entry ID is required.' });
    }

    try {
      const query = `
        UPDATE dry_process_entries
        SET status = 'REJECTED',
            approved_by_user_id = $1,
            approval_timestamp = NOW()
        WHERE id = $2 AND status = 'PENDING'
        RETURNING *;
      `;
      const values = [adminUserId, entryId];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending dry process entry not found or already processed.' });
      }

      res.status(200).json({
        message: 'Dry process entry rejected successfully.',
        rejectedEntry: result.rows[0]
      });

    } catch (error) {
      console.error('Error rejecting dry process entry:', error);
      res.status(500).json({ message: 'Server error rejecting dry process entry.' });
    }
};

// GET APPROVED Dry Process Entries within a date range (Admin or authorized role)
exports.getApprovedDryProcessForReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Both startDate and endDate are required for the report.' });
  }
  // Basic date validation
  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'Start date cannot be after end date.' });
  }

  try {
    const reportQuery = `
      SELECT
        dp.id,
        dp.entry_date,
        dp.style_number,
        dp.process_name,
        dp.quantity,
        dp.status,
        u_entered.username AS entered_by_username,
        dp.entry_timestamp,
        u_approved.username AS approved_by_username,
        dp.approval_timestamp
      FROM
        dry_process_entries dp
      JOIN
        users u_entered ON dp.entered_by_user_id = u_entered.id
      LEFT JOIN
        users u_approved ON dp.approved_by_user_id = u_approved.id
      WHERE
        dp.status = 'APPROVED'
        AND dp.entry_date >= $1
        AND dp.entry_date <= $2
      ORDER BY
        dp.entry_date DESC, dp.id DESC;
    `;
    const values = [startDate, endDate];
    const result = await db.query(reportQuery, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching approved dry process entries for report:', error);
    res.status(500).json({ message: 'Server error fetching dry process report data.' });
  }
};
