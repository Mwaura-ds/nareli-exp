import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // DETECTIVE LOG 1: This will show up in your terminal
    console.log("📩 Backend received this data:", body); 

    const { name, email, eventType, message } = body;

    // Send the email
    const data = await resend.emails.send({
      from: 'Nareli Experience <onboarding@resend.dev>', 
      to: ['narelieventske@gmail.com'], 
      subject: `New Event Inquiry: ${eventType}`,
      html: `
        <h2>New Booking Inquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Event Type:</strong> ${eventType}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });

    // DETECTIVE LOG 2: This will show up if the email actually sends
    console.log("✅ Email sent successfully:", data);
    return NextResponse.json({ success: true, data });

  } catch (error) {
    // DETECTIVE LOG 3: This will show up if Resend rejects the email
    console.error("ERROR SENDING EMAIL:", error); 
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}