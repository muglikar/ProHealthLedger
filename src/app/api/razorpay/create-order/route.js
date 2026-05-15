import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });

    const { amount, currency, tier, description } = await req.json();

    if (!amount || !currency || !tier) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const options = {
      amount: amount * 100, // Razorpay amounts are in paise (smallest currency unit)
      currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        tier,
        description: description || 'ProHealthLedger Sponsorship'
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
