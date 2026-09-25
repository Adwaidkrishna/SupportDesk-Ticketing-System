import { getReports as getReportsService } from '../../../services/admin/reports/getReports.service.js';

/**
 * Controller to handle GET /api/v1/admin/reports
 */
export const getReports = async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    const data = await getReportsService({ timeframe });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export default getReports;
