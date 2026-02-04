import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
  let uuid, treino;
  try {
    const requestData = await request.json();
    uuid = requestData.uuid;
    treino = requestData.treino;

    if (!uuid || !treino) {
      return NextResponse.json(
        { error: 'UUID e treino são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar se treino tem estrutura válida
    if (!Array.isArray(treino)) {
      return NextResponse.json(
        { error: 'Treino deve ser um array' },
        { status: 400 }
      );
    }

    // Atualizar a estrutura completa do treino
    const userRef = database.ref(`users/${uuid}`);
    await userRef.child('Treino').update({
      treino: treino
    });

    return NextResponse.json({ 
      success: true,
      message: 'Treino salvo com sucesso'
    });

  } catch (error: any) {
    console.error('Erro detalhado ao salvar treino:', {
      error: error?.message || 'Erro desconhecido',
      stack: error?.stack,
      uuidParam: uuid,
      treinoLength: Array.isArray(treino) ? treino.length : 'não é array'
    });
    
    return NextResponse.json(
      { 
        error: `Erro interno do servidor: ${error?.message || 'Erro desconhecido'}`,
        details: error?.stack
      },
      { status: 500 }
    );
  }
}