/**
 * Script para corrigir o nome da loja de "Moda Tailandesa" para "THAIS MODA"
 */

const lojistaId = "hOQL4BaVY92787EjKVMt";
const url = `http://localhost:3000/api/lojista/fix-nome`;

async function fixNome() {
  try {
    console.log("Corrigindo nome da loja...");
    console.log("lojistaId:", lojistaId);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lojistaId }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Sucesso:", data.message);
      if (data.nomeAnterior) {
        console.log("Nome anterior:", data.nomeAnterior);
        console.log("Nome novo:", data.nomeNovo);
      } else {
        console.log("Nome atual:", data.nomeAtual);
      }
    } else {
      console.error("❌ Erro:", data.error);
    }
  } catch (error) {
    console.error("❌ Erro ao executar script:", error.message);
  }
}

fixNome();

