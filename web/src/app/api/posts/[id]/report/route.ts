import { NextRequest, NextResponse } from "next/server";
import { ReportSystem, ReportReason, getClientIP } from "@/lib/security";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  
  try {
    const body = await req.json();
    const { reason, description } = body;
    
    // Validate reason
    if (!Object.values(ReportReason).includes(reason)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid report reason' },
        { status: 400 }
      );
    }
    
    // Get reporter info
    const reporterId = req.headers.get('x-client-key') || 'anonymous';
    const ipAddress = getClientIP(req as any);
    
    // Create report
    const result = await ReportSystem.createReport({
      postId,
      reporterId,
      reason,
      description,
      ipAddress,
    });
    
    if (result.success) {
      return NextResponse.json({
        ok: true,
        reportId: result.reportId,
        message: 'Thank you for your report. We will review it promptly.',
      });
    } else {
      return NextResponse.json(
        { ok: false, error: result.error || 'Failed to submit report' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}