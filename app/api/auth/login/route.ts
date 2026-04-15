import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

const DB_ID = 'scorecards_db_main';
const ACCESS_COLLECTION_ID = 'employee_access';

function getDatabase() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return new Databases(client);
}

export async function POST(request: NextRequest) {
  try {
    const { employee_name, pin } = await request.json();

    if (!employee_name || !pin || pin.length < 4) {
      return NextResponse.json({ success: false, error: 'Invalid input.' }, { status: 400 });
    }

    const databases = getDatabase();
    const response = await databases.listDocuments(DB_ID, ACCESS_COLLECTION_ID, [
      JSON.stringify({ method: 'equal', attribute: 'employee_name', values: [employee_name] }),
    ]);

    let isValid = false;

    if (response.documents.length > 0) {
      const userDoc = response.documents[0];
      if (userDoc.pin === pin) {
        isValid = true;
      }
    } else {
      // No custom PIN set — default is "0000"
      if (pin === '0000') {
        isValid = true;
      }
    }

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid PIN.' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
