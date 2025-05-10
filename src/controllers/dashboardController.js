// src/controllers/dashboardController.js
const db = require('../config/db');

// Get summary data for the dashboard
exports.getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    // 1. Bulk Inputs Today
    const bulkInputsQuery = `
      SELECT COUNT(*) AS count
      FROM bulk_inputs
      WHERE entry_date = $1;
    `;
    const bulkInputsResult = await db.query(bulkInputsQuery, [today]);
    const bulkInputsToday = parseInt(bulkInputsResult.rows[0].count) || 0;

    // 2. Units Completed Today
    // Assuming 'FINISH' in washing_entries means completed
    const unitsCompletedQuery = `
      SELECT SUM(quantity) AS total_quantity
      FROM washing_entries
      WHERE entry_date = $1 AND status = 'APPROVED' AND wash_category = 'FINISH';
    `;
    const unitsCompletedResult = await db.query(unitsCompletedQuery, [today]);
    const unitsCompletedToday = parseInt(unitsCompletedResult.rows[0].total_quantity) || 0;

    // 3. Finished Goods Awaiting Gate Pass (Placeholder - needs specific logic)
    // This is a complex query and depends on how you define "awaiting gate pass".
    // For now, using a placeholder. You'll need to replace this with a real query.
    // Example idea: Sum quantities from a 'finished_goods' table or 'washing_entries' with 'FINISH' status
    // that haven't been 'APPROVED' in 'gate_pass_entries'.
    const finishedGoodsAwaitingGatePass = 50; // Placeholder - Replace with actual query logic

    // 4. Shipped via Gate Pass Today
    const shippedTodayQuery = `
      SELECT SUM(quantity) AS total_shipped
      FROM gate_pass_entries
      WHERE entry_date = $1 AND status = 'APPROVED';
    `;
    const shippedTodayResult = await db.query(shippedTodayQuery, [today]);
    const shippedViaGatePassToday = parseInt(shippedTodayResult.rows[0].total_shipped) || 0;

    res.status(200).json({
      bulkInputsToday,
      unitsCompletedToday,
      finishedGoodsAwaitingGatePass,
      shippedViaGatePassToday,
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Server error fetching dashboard summary.' });
  }
};

// Get Dry Process Chart Data based on timeframe
exports.getDryProcessChartData = async (req, res) => {
  const { timeframe } = req.query; // 'daily', 'weekly', 'monthly'
  let startDate;
  const endDate = new Date(); // Today

  if (timeframe === 'daily') {
    startDate = new Date(); // Data for today
  } else if (timeframe === 'weekly') {
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); // Last 7 days (including today)
  } else if (timeframe === 'monthly') {
    startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); // Last 30 days (including today)
  } else {
    // Default to daily or return an error for invalid timeframe
    // For this example, let's default to daily if timeframe is invalid or not provided
    // Or, you can return an error:
    // return res.status(400).json({ message: 'Invalid timeframe. Use daily, weekly, or monthly.' });
    console.warn(`Invalid or missing timeframe: "${timeframe}", defaulting to daily.`);
    startDate = new Date(); // Default to daily
  }

  const formattedStartDate = startDate.toISOString().slice(0, 10);
  const formattedEndDate = endDate.toISOString().slice(0, 10);

  try {
    const query = `
      SELECT
        process_name AS name,  -- Alias for Recharts compatibility
        SUM(quantity) AS processed -- Alias for Recharts compatibility
      FROM
        dry_process_entries
      WHERE
        status = 'APPROVED'
        AND entry_date >= $1
        AND entry_date <= $2
      GROUP BY
        process_name
      ORDER BY
        SUM(quantity) DESC; -- Order by most processed for better chart readability
    `;
    const values = [formattedStartDate, formattedEndDate];
    const result = await db.query(query, values);

    // Format names and ensure 'processed' is a number
    const chartData = result.rows.map(row => ({
        name: row.name ? row.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Process',
        processed: parseInt(row.processed) || 0
    }));

    res.status(200).json(chartData);

  } catch (error) {
    console.error('Error fetching dry process chart data:', error);
    res.status(500).json({ message: 'Server error fetching dry process chart data.' });
  }
};

// You will add getWashingProcessChartData here later in a similar way
// exports.getWashingProcessChartData = async (req, res) => { ... };
