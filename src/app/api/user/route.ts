import { NextRequest, NextResponse } from 'next/server';
import { auth, database } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Busca o usuário no Firebase Auth pelo email
    const userRecord = await auth.getUserByEmail(email);
    const uuid = userRecord.uid;

    // Busca apenas o objeto Treino do usuário no Realtime Database
    const treinoSnapshot = await database.ref(`users/${uuid}/Treino`).once('value');
    
    if (!treinoSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Treino não encontrado para este usuário' },
        { status: 404 }
      );
    }

    const treinoCompleto = treinoSnapshot.val();
    
    // Extrai apenas os campos nivel, musculo e treino
    const treinoData = {
      nivel: treinoCompleto.nivel || null,
      musculo: treinoCompleto.musculo || null,
      treino: treinoCompleto.treino || null
    };

    return NextResponse.json({
      uuid,
      authData: {
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      treinoData
    });

  } catch (error: any) {
    console.error('Erro ao buscar usuário:', error);
    
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'Usuário não encontrado no Authentication' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}