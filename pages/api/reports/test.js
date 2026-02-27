/**
 * Test endpoint - Tenant sistemi çalışıyor mu kontrol et
 */

import { getReportContext } from "@/lib/reportHelpers";
import { connectToDatabase } from "@/lib/mongodb";

export default async function handler(req, res) {
  try {
    await connectToDatabase();
    const context = await getReportContext(req);

    res.json({
      success: true,
      message: "Multi-tenant sistem çalışıyor!",
      tenant: {
        companyId: context.companyId,
        companyName: context.companyName,
        userId: context.userId,
        userName: context.userName,
        role: context.userRole,
        isAdmin: context.isAdmin
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
}