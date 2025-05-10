// src/controllers/subContractController.js
const db = require('../config/db');

// Add New Sub Contract Entry
exports.addSCEntry = async (req, res) => {
  const { date, subContractorName, styleNumber, processName, quantity, unitPriceUsed, calculatedSalary } = req.body;
  const entered_by_user_id = req.user.id; // Assuming req.user is set by auth middleware

  // Basic validation
  if (!date || !subContractorName || !styleNumber || !processName || quantity === undefined || unitPriceUsed === undefined || calculatedSalary === undefined) {
    return res.status(400).json({ message: 'All fields including date, subContractorName, styleNumber, processName, quantity, unitPriceUsed, and calculatedSalary are required.' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }
  if (isNaN(parseFloat(unitPriceUsed)) || parseFloat(unitPriceUsed) < 0 || isNaN(parseFloat(calculatedSalary)) || parseFloat(calculatedSalary) < 0) {
      return res.status(400).json({ message: 'Unit price and calculated salary must be valid non-negative numbers.' });
  }
  // Optional: Add more specific validation for processName if needed

  try {
    const query = `
      INSERT INTO sub_contract_entries
        (entry_date, sub_contractor_name, style_number, process_name, quantity, unit_price_used, calculated_salary, status, entered_by_user_id, entry_timestamp)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    const values = [
        date,
        subContractorName,
        styleNumber,
        processName,
        parseInt(quantity),
        parseFloat(unitPriceUsed),
        parseFloat(calculatedSalary),
        'PENDING', // Default status
        entered_by_user_id
    ];
    const result = await db.query(query, values);

    res.status(201).json({
      message: 'Sub contract entry added successfully and awaiting approval.',
      subContractEntry: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding sub contract entry:', error);
    if (error.code === '23514') { // Check constraint violation (e.g., invalid process_name)
        return res.status(400).json({ message: `Invalid data provided. Error: ${error.detail || error.message}` });
    }
    if (error.code === '22P02') { // Invalid numeric input
        return res.status(400).json({ message: `Invalid numeric value provided for price or salary. Error: ${error.message}` });
    }
    res.status(500).json({ message: 'Server error adding sub contract entry.' });
  }
};

// Get all PENDING Sub Contract Entries (Admin only)
exports.getPendingSCEntries = async (req, res) => {
  try {
    const query = `
        SELECT sc.id,
               sc.entry_date,
               sc.sub_contractor_name,
               sc.style_number,
               sc.process_name,
               sc.quantity,
               sc.unit_price_used,
               sc.calculated_salary,
               sc.status,
               u.username as entered_by_username,
               sc.entry_timestamp
        FROM sub_contract_entries sc
        JOIN users u ON sc.entered_by_user_id = u.id
        WHERE sc.status = 'PENDING'
        ORDER BY sc.entry_timestamp DESC;
        `;
    const result = await db.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching pending sub contract entries:', error);
    res.status(500).json({ message: 'Server error fetching pending sub contract entries.' });
  }
};

// Approve a Sub Contract Entry (Admin only)
exports.approveSCEntry = async (req, res) => {
  const entryId = req.params.id;
  const adminUserId = req.user.id;

  if (!entryId) {
      return res.status(400).json({ message: 'Sub Contract entry ID is required.' });
  }

  try {
    const query = `
      UPDATE sub_contract_entries
      SET status = 'APPROVED',
          approved_by_user_id = $1,
          approval_timestamp = NOW()
      WHERE id = $2 AND status = 'PENDING'
      RETURNING *;
    `;
    const values = [adminUserId, entryId];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending sub contract entry not found or already processed.' });
    }
    res.status(200).json({
      message: 'Sub contract entry approved successfully.',
      approvedEntry: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving sub contract entry:', error);
    res.status(500).json({ message: 'Server error approving sub contract entry.' });
  }
};

// Reject a Sub Contract Entry (Admin only)
exports.rejectSCEntry = async (req, res) => {
    const entryId = req.params.id;
    const adminUserId = req.user.id;

    if (!entryId) {
        return res.status(400).json({ message: 'Sub Contract entry ID is required.' });
    }

    try {
      const query = `
        UPDATE sub_contract_entries
        SET status = 'REJECTED',
            approved_by_user_id = $1,
            approval_timestamp = NOW()
        WHERE id = $2 AND status = 'PENDING'
        RETURNING *;
      `;
      const values = [adminUserId, entryId];
      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending sub contract entry not found or already processed.' });
      }
      res.status(200).json({
        message: 'Sub contract entry rejected successfully.',
        rejectedEntry: result.rows[0]
      });
    } catch (error) {
      console.error('Error rejecting sub contract entry:', error);
      res.status(500).json({ message: 'Server error rejecting sub contract entry.' });
    }
};

// GET APPROVED Sub Contract Entries within a date range
exports.getApprovedSCEntriesForReport = async (req, res) => {
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
        sc.id,
        sc.entry_date,
        sc.sub_contractor_name,
        sc.style_number,
        sc.process_name,
        sc.quantity,
        sc.unit_price_used,
        sc.calculated_salary,
        sc.status,
        u_entered.username AS entered_by_username,
        sc.entry_timestamp,
        u_approved.username AS approved_by_username,
        sc.approval_timestamp
      FROM
        sub_contract_entries sc
      JOIN
        users u_entered ON sc.entered_by_user_id = u_entered.id
      LEFT JOIN
        users u_approved ON sc.approved_by_user_id = u_approved.id
      WHERE
        sc.status = 'APPROVED'
        AND sc.entry_date >= $1
        AND sc.entry_date <= $2
      ORDER BY
        sc.entry_date DESC, sc.id DESC;
    `;
    const values = [startDate, endDate];
    const result = await db.query(reportQuery, values);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching approved sub-contract entries for report:', error);
    res.status(500).json({ message: 'Server error fetching sub-contract report data.' });
  }
};
