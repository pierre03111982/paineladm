"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Percent, Check, MessageCircle } from "lucide-react"
import Image from "next/image"

type Composition = {
  id: string
  imagemUrl: string
  createdAt: Date
  customerName: string
  customerWhatsapp: string | null
  produtoNome?: string
  customerId: string
}

type ClientSalesCockpitModalProps = {
  composition: Composition | null
  lojistaId: string
  isOpen: boolean
  onClose: () => void
}

type Product = {
  id: string
  nome: string
  preco: number
  imagemUrl: string | null
  categoria?: string
  tamanhos?: string[]
  cores?: string[]
  medidas?: string
  desconto?: number // % de desconto já aplicado no produto
}

type ProductDisplay = {
  id: string
  name: string
  size: string
  image: string | null
  originalPrice: number
  promoPrice: number
  hasStoreDiscount: boolean
}

export function ClientSalesCockpitModal({
  composition,
  lojistaId,
  isOpen,
  onClose,
}: ClientSalesCockpitModalProps) {
  const [products, setProducts] = useState<ProductDisplay[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [aiAnalysis, setAiAnalysis] = useState<string>("")
  const [whatsappMessage, setWhatsappMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [extraDiscountPercent, setExtraDiscountPercent] = useState<number>(0)
  const [totalOriginal, setTotalOriginal] = useState<number>(0)
  const [totalFinal, setTotalFinal] = useState<number>(0)

  // Carregar produtos da composição
  useEffect(() => {
    if (!composition || !isOpen) {
      setProducts([])
      setSelectedProductIds(new Set())
      return
    }

    // NÃO criar produto inicial - esperar carregar os produtos reais
    // Isso evita mostrar um produto genérico enquanto carrega os verdadeiros
    setProducts([])
    setSelectedProductIds(new Set())

    const loadCompositionData = async () => {
      setIsLoading(true)
      try {
        console.log("[ClientSalesCockpitModal] Buscando produtos para composição:", {
          id: composition.id,
          imagemUrl: composition.imagemUrl,
          customerName: composition.customerName,
          produtoNome: composition.produtoNome
        })
        
        // Passar também a imagemUrl como parâmetro para busca alternativa
        const url = `/api/composicoes/${composition.id}/products?lojistaId=${encodeURIComponent(lojistaId)}&imagemUrl=${encodeURIComponent(composition.imagemUrl || "")}`
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          console.log("[ClientSalesCockpitModal] ✅ Resposta da API:", {
            total: data.products?.length || 0,
            products: data.products
          })
          
          if (data.products && data.products.length > 0) {
            // Transformar produtos para o formato de exibição
            // GARANTIR que cada produto seja uma entrada separada no array
            const productsDisplay: ProductDisplay[] = []
            
            console.log("[ClientSalesCockpitModal] 📦 Processando produtos recebidos:", data.products.map((p: Product) => ({
              id: p.id,
              nome: p.nome,
              preco: p.preco,
              temImagem: !!p.imagemUrl
            })))
            
            data.products.forEach((p: Product) => {
              // Garantir que temos pelo menos um ID e nome
              const produtoId = p.id || `prod-${composition.id}-${productsDisplay.length}`
              const produtoNome = p.nome || "Produto"
              
              // Se o nome do produto contém " + ", significa que são múltiplos produtos combinados
              // Separar em produtos individuais
              if (produtoNome && produtoNome.includes(" + ")) {
                const nomesSeparados = produtoNome.split(" + ")
                nomesSeparados.forEach((nome: string, index: number) => {
                  const precoOriginal = p.preco || 0
                  const descontoExistente = p.desconto || 0
                  const precoPorItem = nomesSeparados.length > 1 ? (precoOriginal / nomesSeparados.length) : precoOriginal
                  const precoPromocional = precoPorItem * (1 - descontoExistente / 100)
                  const tamanho = p.tamanhos && p.tamanhos.length > 0 
                    ? p.tamanhos[0] 
                    : p.medidas || "Único"
                  
                  productsDisplay.push({
                    id: `${produtoId}-${index}`,
                    name: nome.trim() || "Produto",
                    size: tamanho,
                    image: p.imagemUrl, // Mesma imagem para todos por enquanto
                    originalPrice: precoPorItem,
                    promoPrice: precoPromocional,
                    hasStoreDiscount: descontoExistente > 0,
                  })
                })
              } else {
                // Produto único - adicionar normalmente
                const precoOriginal = p.preco || 0
                const descontoExistente = p.desconto || 0
                const precoPromocional = precoOriginal * (1 - descontoExistente / 100)
                const tamanho = p.tamanhos && p.tamanhos.length > 0 
                  ? p.tamanhos[0] 
                  : p.medidas || "Único"
                
                productsDisplay.push({
                  id: produtoId,
                  name: produtoNome,
                  size: tamanho,
                  image: p.imagemUrl,
                  originalPrice: precoOriginal,
                  promoPrice: precoPromocional,
                  hasStoreDiscount: descontoExistente > 0,
                })
              }
            })
            
            // SUBSTITUIR completamente os produtos (não adicionar ao inicial)
            setProducts(productsDisplay)
            // Selecionar todos por padrão ao carregar
            const allIds = new Set(productsDisplay.map(p => p.id))
            setSelectedProductIds(allIds)
            console.log("[ClientSalesCockpitModal] ✅ Produtos processados e substituídos:", productsDisplay.length, "IDs selecionados:", Array.from(allIds))
            console.log("[ClientSalesCockpitModal] 📋 Lista de produtos:", productsDisplay.map(p => ({ id: p.id, nome: p.name })))
          } else {
            console.warn("[ClientSalesCockpitModal] ⚠️ Nenhum produto retornado da API")
            
            // CORREÇÃO PALIATIVA: Se não tem produtos mas tem imagemUrl, usar a imagem da composição
            if (composition.imagemUrl) {
              console.log("[ClientSalesCockpitModal] 🖼️ Usando imagem da composição como fallback visual")
              
              const produtoFallback: ProductDisplay = {
                id: `prod-${composition.id}-look-completo`,
                name: composition.produtoNome || "Look Completo",
                size: "Único",
                image: composition.imagemUrl, // ✅ Usar a própria imagem da composição
                originalPrice: 0, // Permitir preço manual
                promoPrice: 0,
                hasStoreDiscount: false,
              }
              
              setProducts([produtoFallback])
              setSelectedProductIds(new Set([produtoFallback.id]))
              console.log("[ClientSalesCockpitModal] ✅ Produto fallback criado com imagem da composição")
            } else if (composition.produtoNome && composition.produtoNome.includes(" + ")) {
              // Se não tem imagem mas tem nome combinado, separar
              const produtosSeparados = composition.produtoNome.split(" + ").map((nome: string, index: number) => ({
                id: `prod-${composition.id}-${index}`,
                name: nome.trim(),
                size: "Único",
                image: composition.imagemUrl || null, // Tentar usar imagem da composição se tiver
                originalPrice: 0,
                promoPrice: 0,
                hasStoreDiscount: false,
              }))
              setProducts(produtosSeparados)
              const allIds = new Set(produtosSeparados.map(p => p.id))
              setSelectedProductIds(allIds)
              console.log("[ClientSalesCockpitModal] 📋 Produtos separados do nome combinado:", produtosSeparados.length)
            } else {
              // Último fallback: produto genérico
              setProducts([{
                id: `prod-${composition.id}`,
                name: composition.produtoNome || "Produto",
                size: "Único",
                image: composition.imagemUrl || null, // Tentar usar imagem da composição
                originalPrice: 0,
                promoPrice: 0,
                hasStoreDiscount: false,
              }])
            }
          }
        } else {
          const errorText = await response.text()
          console.error("[ClientSalesCockpitModal] ❌ Erro HTTP:", response.status, errorText)
          // Manter o produtoNome que já foi exibido no início
        }

        await generateAIAnalysis()
      } catch (error) {
        console.error("[ClientSalesCockpitModal] Erro ao carregar dados:", error)
        // Não limpar produtos - manter o produtoNome que já foi exibido inicialmente
      } finally {
        setIsLoading(false)
      }
    }

    loadCompositionData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composition?.id, isOpen, lojistaId])

  // Calcular totais quando produtos, seleção ou desconto mudarem
  useEffect(() => {
    if (products.length > 0) {
      updatePricesAndTotal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selectedProductIds, extraDiscountPercent])

  // Função para atualizar preços e totais
  const updatePricesAndTotal = () => {
    if (products.length === 0) {
      setTotalOriginal(0)
      setTotalFinal(0)
      return
    }

    let totalOrig = 0
    let totalFin = 0

    products.forEach(prod => {
      if (selectedProductIds.has(prod.id)) {
        // Preço base é o promocional da loja
        const basePrice = prod.promoPrice
        
        // Aplica desconto extra
        const finalItemPrice = basePrice * ((100 - extraDiscountPercent) / 100)

        totalOrig += basePrice
        totalFin += finalItemPrice
      }
    })

    setTotalOriginal(totalOrig)
    setTotalFinal(totalFin)
  }

  // Toggle seleção de produto
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Gerar análise do cliente pela IA
  const generateAIAnalysis = async () => {
    if (!composition) return

    try {
      const analysis = `Cliente focado em estilo. Sugerir fechamento imediato.`
      setAiAnalysis(analysis)
    } catch (error) {
      console.error("[ClientSalesCockpitModal] Erro ao gerar análise:", error)
    }
  }

  // Gerar mensagem de WhatsApp
  const generateSalesText = async () => {
    if (!composition) return

    const selectedItems = products.filter(p => selectedProductIds.has(p.id))
    
    if (selectedItems.length === 0) {
      alert("Selecione pelo menos um produto!")
      return
    }

    setIsGeneratingMessage(true)
    try {
      const customerName = composition.customerName || "Cliente"
      
      // Monta lista de nomes
      const names = selectedItems.map(p => p.name).join(' + ')
      
      // Texto base
      let text = `Olá ${customerName}! Vi que você gostou da composição com: *${names}*.\n`
      text += `Verifiquei aqui e tenho no seu tamanho.`

      // Lógica do Desconto na Mensagem
      if (extraDiscountPercent > 0) {
        text += `\n\n🎁 *EXCLUSIVO:* Consegui liberar um **DESCONTO EXTRA de ${extraDiscountPercent}%** para fechar agora!\n`
        text += `Deu a louca no gerente: O valor final fica só *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
      } else {
        text += `\n\nAs peças são limitadas e estão saindo muito rápido. Vamos reservar?`
      }

      setWhatsappMessage(text)
    } catch (error) {
      console.error("[ClientSalesCockpitModal] Erro ao gerar mensagem:", error)
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  // Enviar WhatsApp
  const sendToWhatsapp = () => {
    if (!composition?.customerWhatsapp || !whatsappMessage) return

    const cleaned = composition.customerWhatsapp.replace(/\D/g, "")
    const message = encodeURIComponent(whatsappMessage)
    const url = `https://wa.me/55${cleaned}?text=${message}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  // Formatar preço
  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace(".", ",")}`
  }

  // Formatar número de telefone: (DDD) XXXXX-XXXX
  const formatPhoneNumber = (phone: string | null): string => {
    if (!phone) return "Sem WhatsApp"
    
    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "")
    
    // Se tiver 11 dígitos (com DDD): (XX) XXXXX-XXXX
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    
    // Se tiver 10 dígitos (sem o 9 inicial): (XX) XXXX-XXXX
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    
    // Se não tiver o formato esperado, retornar limpo mas sem formatação
    if (cleaned.length > 0) {
      return cleaned
    }
    
    return "Sem WhatsApp"
  }

  if (!isOpen || !composition) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2">
      <div className="relative w-full max-w-[900px] max-h-[95vh] neon-card rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b-2 border-indigo-500/50">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">Cockpit de Vendas</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {composition.customerName} • {formatPhoneNumber(composition.customerWhatsapp)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-[var(--text-main)]" />
          </button>
        </div>

        {/* Content - 2 Colunas */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0">
          {/* Coluna Esquerda - Imagem */}
          <div 
            className="relative flex-shrink-0"
            style={{ 
              margin: 0, 
              padding: 0,
              aspectRatio: '9/16',
              width: '50%',
              minWidth: 0,
              maxWidth: '50%',
              backgroundColor: '#000'
            }}
          >
            <Image
              src={composition.imagemUrl}
              alt={composition.produtoNome || "Composição"}
              fill
              className="object-contain"
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Coluna Direita - Painel Operacional */}
          <div className="flex-1 p-4 overflow-y-auto bg-[var(--bg-card)]">
            <div className="space-y-4">
              {/* Análise IA */}
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-3 border border-indigo-500/50">
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Análise IA
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {isLoading ? "Analisando..." : aiAnalysis || "Gerando análise..."}
                </p>
              </div>

              {/* Produtos Identificados */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-[var(--text-main)]">Produtos Identificados:</h4>
                
                {isLoading ? (
                  <div className="text-xs text-[var(--text-secondary)] p-2">Carregando produtos...</div>
                ) : products.length === 0 ? (
                  <div className="text-xs text-[var(--text-secondary)] p-2 neon-card rounded border-indigo-500/30">
                    Nenhum produto identificado nesta imagem.
                  </div>
                ) : (
                  <div className="max-h-[250px] overflow-y-auto mb-2 border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    <div className="space-y-2">
                      {products.map((prod) => {
                        const isSelected = selectedProductIds.has(prod.id)
                        
                        return (
                          <div
                            key={prod.id}
                            onClick={() => toggleProductSelection(prod.id)}
                            className={`flex items-center bg-[#2b2b40] dark:bg-zinc-800 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#6c5ce7] bg-[#34344a] dark:bg-zinc-700 opacity-100 shadow-lg"
                                : "border-transparent opacity-50 hover:opacity-75"
                            }`}
                          >
                          {/* Imagem do Produto */}
                          {prod.image ? (
                            <div className="relative w-[60px] h-[60px] rounded flex-shrink-0 mr-3 bg-black overflow-hidden">
                              <Image
                                src={prod.image}
                                alt={prod.name}
                                fill
                                className="object-cover"
                                unoptimized
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-[60px] h-[60px] rounded flex-shrink-0 mr-3 bg-zinc-700 flex items-center justify-center">
                              <span className="text-[10px] text-gray-400 text-center px-1">Sem foto</span>
                            </div>
                          )}
                          
                            {/* Detalhes */}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-white mb-1">{prod.name}</div>
                              <div className="text-[10px] text-gray-400 mb-1">
                                Tam: {prod.size} | Ref: {prod.id.replace(/-separated-\d+$/, '').split('-')[0]}
                              </div>
                            </div>

                            {/* Preços */}
                            <div className="text-right ml-2">
                              {prod.hasStoreDiscount && (
                                <div className="text-[10px] line-through text-gray-500 mb-0.5">
                                  {formatPrice(prod.originalPrice)}
                                </div>
                              )}
                              <div className="text-sm font-bold text-white">
                                {formatPrice(prod.promoPrice)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Caixa de Desconto e Totais */}
              <div className="p-3 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-lg border border-orange-500/30">
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-main)] mb-2">
                  <Percent className="h-3 w-3 text-orange-400" />
                  Aplicar Desconto Extra (%):
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    id="extraDiscountInput"
                    value={extraDiscountPercent}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                      setExtraDiscountPercent(value)
                    }}
                    min="0"
                    max="100"
                    className="flex-1 px-3 py-1.5 bg-[var(--bg-card)] border-2 border-indigo-500/30 rounded-lg text-[var(--text-main)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    placeholder="0"
                  />
                  <button
                    onClick={() => updatePricesAndTotal()}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg font-semibold transition-all text-xs flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Aplicar
                  </button>
                </div>
                
                {/* Resumo Financeiro */}
                <div className="bg-[#151520] dark:bg-zinc-900 p-2.5 rounded-lg">
                  <div className="flex justify-between mb-1.5 text-xs text-gray-300">
                    <span>Total Tabela:</span>
                    <span>{formatPrice(totalOriginal)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-700 text-sm font-bold text-white">
                    <span>Total com Desconto:</span>
                    <span className="text-green-400">{formatPrice(totalFinal)}</span>
                  </div>
                </div>
              </div>

              {/* Área de Ações */}
              <div className="space-y-2 pt-2 border-t-2 border-indigo-500/50">
                {/* Gerar Texto de Venda */}
                <button
                  onClick={generateSalesText}
                  disabled={isGeneratingMessage || selectedProductIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {isGeneratingMessage ? "Gerando..." : "✨ Gerar Texto de Venda"}
                </button>

                {/* Área de Texto WhatsApp */}
                <textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="O texto da IA aparecerá aqui..."
                  className="w-full h-24 p-2 bg-[var(--bg-card)] border-2 border-indigo-500/30 rounded-lg text-xs text-[var(--text-main)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />

                {/* Botão Enviar WhatsApp */}
                <button
                  onClick={sendToWhatsapp}
                  disabled={!composition.customerWhatsapp || !whatsappMessage.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  <MessageCircle className="h-3 w-3" />
                  Enviar Proposta
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
