/**
 * Script para corrigir o nome da loja via API
 * Corrige "Moda Tailandesa" para "THAIS MODA"
 */

const lojistaId = "hOQL4BaVY92787EjKVMt";
const url = `http://localhost:3000/api/lojista/perfil`;

async function corrigirNome() {
  try {
    console.log("🔧 Corrigindo nome da loja via API...");
    console.log("lojistaId:", lojistaId);
    
    // Atualizar o nome diretamente
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lojistaId,
        nome: "THAIS MODA"
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Nome atualizado com sucesso!");
      console.log("Nome definido: THAIS MODA");
    } else {
      console.error("❌ Erro:", data.error || "Erro desconhecido");
    }
  } catch (error) {
    console.error("❌ Erro ao executar script:", error.message);
  }
}

corrigirNome();

