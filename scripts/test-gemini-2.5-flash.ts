/**
 * Script de Teste para Gemini 2.5 Flash
 * 
 * Este script testa os dois modelos migrados:
 * 1. gemini-2.5-flash-exp (Análise de Produtos)
 * 2. gemini-2.5-flash-001 (Agente Ana - Chat)
 * 
 * Como usar:
 * 1. Certifique-se de que o servidor Next.js está rodando (npm run dev)
 * 2. Configure as variáveis de ambiente necessárias
 * 3. Execute: npx tsx scripts/test-gemini-2.5-flash.ts
 */

import { productAnalyzerService } from "../src/lib/ai-services/product-analyzer";
import { getVertexAgent } from "../src/lib/ai-services/vertex-agent";

// Cores para output no terminal
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, colors.cyan);
  console.log("=".repeat(60) + "\n");
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

/**
 * Teste 1: Verificar configuração do Product Analyzer (gemini-2.5-flash-exp)
 */
async function testProductAnalyzerConfig() {
  logSection("TESTE 1: Configuração do Product Analyzer (gemini-2.5-flash-exp)");
  
  try {
    const isConfigured = productAnalyzerService.isConfigured();
    
    if (isConfigured) {
      logSuccess("Product Analyzer está configurado corretamente");
      logInfo("Modelo: gemini-2.5-flash-exp");
      
      // Verificar variáveis de ambiente
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
      const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
      
      if (projectId) {
        logInfo(`Project ID: ${projectId}`);
        logInfo(`Location: ${location}`);
      } else {
        logWarning("GOOGLE_CLOUD_PROJECT_ID não está configurado");
      }
      
      return true;
    } else {
      logError("Product Analyzer NÃO está configurado");
      logWarning("Configure GOOGLE_CLOUD_PROJECT_ID no arquivo .env");
      return false;
    }
  } catch (error: any) {
    logError(`Erro ao verificar configuração: ${error.message}`);
    return false;
  }
}

/**
 * Teste 2: Testar análise de produto com imagem (gemini-2.5-flash-exp)
 */
async function testProductAnalysis(imageUrl?: string) {
  logSection("TESTE 2: Análise de Produto (gemini-2.5-flash-exp)");
  
  // URL de imagem de teste (pode ser substituída)
  const testImageUrl = imageUrl || "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400";
  
  logInfo(`Testando com imagem: ${testImageUrl.substring(0, 60)}...`);
  
  try {
    const result = await productAnalyzerService.analyzeProductImage(testImageUrl);
    
    if (result.success && result.data) {
      logSuccess("Análise de produto concluída com sucesso!");
      console.log("\n📊 Resultado da Análise:");
      console.log(JSON.stringify(result.data, null, 2));
      
      // Validar campos obrigatórios
      const requiredFields = [
        "nome_sugerido",
        "descricao_seo",
        "suggested_category",
        "product_type",
        "detected_fabric",
        "dominant_colors",
      ];
      
      const missingFields = requiredFields.filter(
        (field) => !result.data![field as keyof typeof result.data]
      );
      
      if (missingFields.length === 0) {
        logSuccess("Todos os campos obrigatórios estão presentes");
      } else {
        logWarning(`Campos faltando: ${missingFields.join(", ")}`);
      }
      
      if (result.processingTime) {
        logInfo(`Tempo de processamento: ${result.processingTime}ms`);
      }
      
      return true;
    } else {
      logError(`Falha na análise: ${result.error}`);
      return false;
    }
  } catch (error: any) {
    logError(`Erro ao analisar produto: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Teste 3: Verificar configuração do Vertex Agent (gemini-2.5-flash-001)
 */
async function testVertexAgentConfig() {
  logSection("TESTE 3: Configuração do Vertex Agent (gemini-2.5-flash-001)");
  
  try {
    const agent = getVertexAgent();
    logSuccess("Vertex Agent inicializado com sucesso");
    logInfo("Modelo: gemini-2.5-flash-001");
    
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      logInfo(`Project ID: ${projectId}`);
    } else {
      logWarning("GOOGLE_CLOUD_PROJECT_ID ou FIREBASE_PROJECT_ID não está configurado");
    }
    
    return true;
  } catch (error: any) {
    logError(`Erro ao inicializar Vertex Agent: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Teste 4: Testar chat do Agente Ana (gemini-2.5-flash-001)
 */
async function testChatAgent() {
  logSection("TESTE 4: Chat do Agente Ana (gemini-2.5-flash-001)");
  
  try {
    const agent = getVertexAgent();
    
    const testMessage = "Olá! Você está funcionando corretamente?";
    const testContext = "Você é Ana, a assistente virtual do sistema. Responda de forma amigável e profissional.";
    
    logInfo(`Enviando mensagem de teste: "${testMessage}"`);
    
    const response = await agent.sendMessage(testMessage, testContext);
    
    if (response && response.text) {
      logSuccess("Chat funcionando corretamente!");
      console.log("\n💬 Resposta do Agente Ana:");
      console.log(response.text);
      
      if (response.groundingMetadata?.webSearchQueries?.length) {
        logInfo(`Google Search foi usado: ${response.groundingMetadata.webSearchQueries.length} queries`);
      }
      
      return true;
    } else {
      logError("Resposta vazia do chat");
      return false;
    }
  } catch (error: any) {
    logError(`Erro ao testar chat: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Teste 5: Verificar se os modelos estão corretos no código
 */
async function testModelNames() {
  logSection("TESTE 5: Verificação dos Nomes dos Modelos no Código");
  
  try {
    // Verificar product-analyzer.ts
    const fs = require("fs");
    const path = require("path");
    
    const productAnalyzerPath = path.join(
      __dirname,
      "../src/lib/ai-services/product-analyzer.ts"
    );
    const vertexAgentPath = path.join(
      __dirname,
      "../src/lib/ai-services/vertex-agent.ts"
    );
    
    const productAnalyzerCode = fs.readFileSync(productAnalyzerPath, "utf-8");
    const vertexAgentCode = fs.readFileSync(vertexAgentPath, "utf-8");
    
    // Verificar gemini-2.5-flash-exp
    if (productAnalyzerCode.includes("gemini-2.5-flash-exp")) {
      logSuccess("product-analyzer.ts usa gemini-2.5-flash-exp ✅");
    } else if (productAnalyzerCode.includes("gemini-2.0-flash")) {
      logError("product-analyzer.ts ainda usa gemini-2.0-flash ❌");
      return false;
    } else {
      logWarning("Não foi possível verificar o modelo em product-analyzer.ts");
    }
    
    // Verificar gemini-2.5-flash-001
    if (vertexAgentCode.includes("gemini-2.5-flash-001")) {
      logSuccess("vertex-agent.ts usa gemini-2.5-flash-001 ✅");
    } else if (vertexAgentCode.includes("gemini-2.0-flash")) {
      logError("vertex-agent.ts ainda usa gemini-2.0-flash ❌");
      return false;
    } else {
      logWarning("Não foi possível verificar o modelo em vertex-agent.ts");
    }
    
    return true;
  } catch (error: any) {
    logError(`Erro ao verificar nomes dos modelos: ${error.message}`);
    return false;
  }
}

/**
 * Executar todos os testes
 */
async function runAllTests() {
  console.clear();
  log("🚀 INICIANDO TESTES DO GEMINI 2.5 FLASH", colors.cyan);
  log("=".repeat(60));
  
  const results = {
    configProductAnalyzer: false,
    productAnalysis: false,
    configVertexAgent: false,
    chatAgent: false,
    modelNames: false,
  };
  
  // Teste 1: Configuração
  results.configProductAnalyzer = await testProductAnalyzerConfig();
  
  // Teste 2: Análise de produto (só se configurado)
  if (results.configProductAnalyzer) {
    results.productAnalysis = await testProductAnalysis();
  } else {
    logWarning("Pulando teste de análise de produto (configuração inválida)");
  }
  
  // Teste 3: Configuração Vertex Agent
  results.configVertexAgent = await testVertexAgentConfig();
  
  // Teste 4: Chat (só se configurado)
  if (results.configVertexAgent) {
    results.chatAgent = await testChatAgent();
  } else {
    logWarning("Pulando teste de chat (configuração inválida)");
  }
  
  // Teste 5: Verificação de nomes
  results.modelNames = await testModelNames();
  
  // Resumo final
  logSection("RESUMO DOS TESTES");
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Testes aprovados: ${passedTests}`);
  console.log(`Testes falhados: ${totalTests - passedTests}\n`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const testName = test
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    if (passed) {
      logSuccess(`${testName}: PASSOU`);
    } else {
      logError(`${testName}: FALHOU`);
    }
  });
  
  if (passedTests === totalTests) {
    log("\n🎉 TODOS OS TESTES PASSARAM! O Gemini 2.5 Flash está funcionando corretamente.", colors.green);
  } else {
    log("\n⚠️  ALGUNS TESTES FALHARAM. Verifique as configurações e tente novamente.", colors.yellow);
  }
  
  return passedTests === totalTests;
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Erro fatal: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

export { runAllTests, testProductAnalyzerConfig, testProductAnalysis, testVertexAgentConfig, testChatAgent, testModelNames };
