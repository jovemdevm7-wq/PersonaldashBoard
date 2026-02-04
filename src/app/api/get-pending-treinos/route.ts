import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const pendentesRef = database.ref('pendentes');
    const snapshot = await pendentesRef.once('value');
    const pendentes = snapshot.val() || {};

    // Converter para array e ordenar por timestamp
    const pendentesList = Object.entries(pendentes).map(([id, data]: [string, any]) => ({
      id,
      ...data
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ pendentes: pendentesList });

  } catch (error) {
    console.error('Erro ao buscar treinos pendentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}