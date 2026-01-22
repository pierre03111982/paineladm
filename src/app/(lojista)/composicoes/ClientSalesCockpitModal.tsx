"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, Sparkles, Percent, Check, MessageCircle, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

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
  const [socialMediaDiscount, setSocialMediaDiscount] = useState<number>(0) // Desconto de redes sociais
  const [totalOriginal, setTotalOriginal] = useState<number>(0)
  const [totalFinal, setTotalFinal] = useState<number>(0)

  // Carregar desconto extra salvo para esta composição
  useEffect(() => {
    if (!composition?.id || !isOpen) {
      setExtraDiscountPercent(0)
      return
    }

    // Carregar desconto extra salvo para esta composição específica
    const storageKey = `cockpit-extra-discount-${composition.id}`
    const savedDiscount = localStorage.getItem(storageKey)
    if (savedDiscount) {
      const discountValue = parseFloat(savedDiscount)
      if (!isNaN(discountValue) && discountValue >= 0 && discountValue <= 100) {
        setExtraDiscountPercent(discountValue)
      }
    } else {
      setExtraDiscountPercent(0)
    }
  }, [composition?.id, isOpen])

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

        // Não gerar análise aqui - será gerada pelo useEffect quando tudo estiver pronto
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

  // Buscar desconto de redes sociais do lojista
  useEffect(() => {
    if (!lojistaId || !isOpen) {
      setSocialMediaDiscount(0)
      return
    }

    const fetchSocialDiscount = async () => {
      try {
        const response = await fetch(`/api/lojista/perfil?lojistaId=${encodeURIComponent(lojistaId)}`)
        if (response.ok) {
          const data = await response.json()
          const discount = data.descontoRedesSociais || 0
          // Verificar se o desconto não expirou
          if (data.descontoRedesSociaisExpiraEm) {
            const expiryDate = new Date(data.descontoRedesSociaisExpiraEm)
            if (expiryDate < new Date()) {
              setSocialMediaDiscount(0)
              return
            }
          }
          setSocialMediaDiscount(discount)
        }
      } catch (error) {
        console.error("[ClientSalesCockpitModal] Erro ao buscar desconto de redes sociais:", error)
        setSocialMediaDiscount(0)
      }
    }

    fetchSocialDiscount()
  }, [lojistaId, isOpen])

  // Calcular totais quando produtos, seleção ou desconto mudarem
  useEffect(() => {
    if (products.length > 0) {
      updatePricesAndTotal()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, selectedProductIds, extraDiscountPercent, socialMediaDiscount])

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
        
        // Aplicar primeiro o desconto de redes sociais
        const priceAfterSocial = basePrice * ((100 - socialMediaDiscount) / 100)
        
        // Depois aplicar o desconto extra do cockpit
        const finalItemPrice = priceAfterSocial * ((100 - extraDiscountPercent) / 100)

        totalOrig += basePrice
        totalFin += finalItemPrice
      }
    })

    setTotalOriginal(totalOrig)
    setTotalFinal(totalFin)
  }

  // Calcular desconto total (redes sociais + extra)
  const totalDiscountPercent = socialMediaDiscount + extraDiscountPercent
  
  // Calcular valor do desconto em reais
  const discountAmount = totalOriginal - totalFinal

  // Atualizar texto de venda automaticamente quando produtos selecionados ou valores mudarem
  useEffect(() => {
    if (!composition || isLoading || products.length === 0) {
      return
    }

    const selectedItems = products.filter(p => selectedProductIds.has(p.id))
    
    // Só atualiza se houver produtos selecionados
    if (selectedItems.length === 0) {
      setWhatsappMessage("")
      return
    }

    // Função para gerar o texto automaticamente (sem alert)
    const autoGenerateText = () => {
      const customerName = composition.customerName || "Cliente"
      
      // Monta lista de nomes
      const names = selectedItems.map(p => p.name).join(' + ')
      
      // Texto base
      let text = `Olá ${customerName}! Vi que você gostou da combinação: *${names}*.\n\n`
      text += `Verifiquei aqui e tenho no seu tamanho.`

      // Lógica do Desconto na Mensagem
      if (totalDiscountPercent > 0) {
        if (socialMediaDiscount > 0 && extraDiscountPercent > 0) {
          text += `\n\n🎁 *EXCLUSIVO:* Você já tem *${socialMediaDiscount}%* de desconto da parceiria nas redes sociais, e eu consegui liberar mais *${extraDiscountPercent}%* para fechar agora!\n\n`
          text += `Total de desconto: **${formatDiscountPercent(totalDiscountPercent)}%**\n\n`
          text += `É deu a louca no gerente! O valor final fica só *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        } else if (socialMediaDiscount > 0) {
          text += `\n\n🎁 Você tem *${socialMediaDiscount}%* de desconto da parceiria nas redes sociais aplicado!\n\n`
          text += `O valor final fica *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        } else if (extraDiscountPercent > 0) {
          text += `\n\n🎁 *EXCLUSIVO:* Eu consegui liberar um **DESCONTO EXTRA de ${extraDiscountPercent}%** para fechar agora!\n\n`
          text += `É deu a louca no gerente! O valor final fica só *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        }
      } else {
        text += `\n\nAs peças são limitadas e estão saindo muito rápido. Vamos reservar?`
      }

      setWhatsappMessage(text)
    }

    // Pequeno delay para evitar atualizações muito frequentes
    const timeoutId = setTimeout(() => {
      autoGenerateText()
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds, totalFinal, totalDiscountPercent, socialMediaDiscount, extraDiscountPercent, products, composition, isLoading])

  // Converter Set para string para detectar mudanças no useEffect
  const selectedProductIdsString = Array.from(selectedProductIds).sort().join(',')

  // Atualizar análise quando produtos ou seleção mudarem
  useEffect(() => {
    // Só gerar análise se tiver produtos carregados, não estiver carregando, e tiver composição
    if (products.length > 0 && !isLoading && composition) {
      // Delay maior para garantir que todos os cálculos (totalOriginal, totalFinal) estejam completos
      const timeoutId = setTimeout(() => {
        // Verificar se os valores estão prontos antes de gerar
        if (products.length > 0) {
          generateAIAnalysis()
        }
      }, 600)
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, selectedProductIdsString, totalOriginal, totalFinal, totalDiscountPercent, socialMediaDiscount, extraDiscountPercent, composition?.id, isLoading])

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
      // Usar os valores atuais diretamente para evitar problemas de closure
      const currentSelectedIds = selectedProductIds
      const currentProducts = products
      const currentTotalOriginal = totalOriginal
      const currentTotalFinal = totalFinal
      const currentTotalDiscount = totalDiscountPercent
      
      // Verificar se temos dados válidos antes de gerar análise
      if (currentProducts.length === 0) {
        return // Não gerar análise se não houver produtos
      }
      
      const selectedItems = currentProducts.filter(p => currentSelectedIds.has(p.id))
      const totalItems = selectedItems.length
      const customerName = composition.customerName || "Cliente"
      
      console.log("[ClientSalesCockpitModal] 🔍 Gerando análise:", {
        totalProducts: currentProducts.length,
        selectedIds: Array.from(currentSelectedIds),
        selectedItems: selectedItems.length,
        totalOriginal: currentTotalOriginal,
        totalFinal: currentTotalFinal,
        totalDiscount: currentTotalDiscount
      })
      
      // Análise baseada nos dados disponíveis
      let analysis = `👤 **${customerName}**\n\n`
      
      if (totalItems > 0) {
        analysis += `🛍️ **Interesse:** ${totalItems} ${totalItems === 1 ? 'produto selecionado' : 'produtos selecionados'}\n`
        
        // Calcular ticket médio apenas se houver produtos selecionados e valor total
        if (currentTotalOriginal > 0 && totalItems > 0) {
          const avgTicket = currentTotalOriginal / totalItems
          analysis += `💰 **Ticket médio:** R$ ${avgTicket.toFixed(2).replace('.', ',')}\n`
        }
        analysis += `\n`
      } else {
        analysis += `🛍️ **Interesse:** Nenhum produto selecionado ainda.\n\n`
      }
      
      if (currentTotalOriginal > 0) {
        analysis += `💵 **Valor total:** R$ ${currentTotalOriginal.toFixed(2).replace('.', ',')}\n`
        
        if (currentTotalDiscount > 0) {
          analysis += `🎁 **Desconto aplicado:** ${formatDiscountPercent(currentTotalDiscount)}%\n`
        }
        
        analysis += `✅ **Valor final:** R$ ${currentTotalFinal.toFixed(2).replace('.', ',')}\n\n`
      } else if (totalItems > 0) {
        analysis += `💵 **Valor total:** Produtos sem preço definido\n\n`
      }
      
      // Análise comportamental
      if (totalItems >= 3) {
        analysis += `🔥 **Alto interesse:** Cliente selecionou múltiplos itens. Oportunidade de fechamento imediato com proposta personalizada.\n`
      } else if (totalItems === 2) {
        analysis += `✨ **Interesse moderado:** Cliente demonstrou interesse em composição. Sugerir complementos ou fechamento com desconto.\n`
      } else if (totalItems === 1) {
        analysis += `💡 **Interesse específico:** Cliente focou em um produto. Oferecer peças complementares ou fechar com urgência.\n`
      } else {
        analysis += `📋 **Aguardando seleção:** Cliente ainda não selecionou produtos. Sugerir produtos da composição.\n`
      }
      
      if (currentTotalDiscount > 0) {
        analysis += `\n💬 **Estratégia:** Desconto já aplicado (${formatDiscountPercent(currentTotalDiscount)}%) cria urgência. Enfatizar valor e disponibilidade limitada.`
      } else if (totalItems > 0) {
        analysis += `\n💬 **Estratégia:** Oferecer desconto progressivo pode acelerar fechamento.`
      } else {
        analysis += `\n💬 **Estratégia:** Apresentar os produtos identificados e destacar disponibilidade.`
      }
      
      setAiAnalysis(analysis)
    } catch (error) {
      console.error("[ClientSalesCockpitModal] Erro ao gerar análise:", error)
      setAiAnalysis("Erro ao gerar análise. Tente novamente.")
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
      let text = `Olá ${customerName}! Vi que você gostou da combinação: *${names}*.\n\n`
      text += `Verifiquei aqui e tenho no seu tamanho.`

      // Lógica do Desconto na Mensagem
      if (totalDiscountPercent > 0) {
        if (socialMediaDiscount > 0 && extraDiscountPercent > 0) {
          text += `\n\n🎁 *EXCLUSIVO:* Você já tem *${socialMediaDiscount}%* de desconto da parceiria nas redes sociais, e eu consegui liberar mais *${extraDiscountPercent}%* para fechar agora!\n\n`
          text += `Total de desconto: **${formatDiscountPercent(totalDiscountPercent)}%**\n\n`
          text += `É deu a louca no gerente! O valor final fica só *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        } else if (socialMediaDiscount > 0) {
          text += `\n\n🎁 Você tem *${socialMediaDiscount}%* de desconto da parceiria nas redes sociais aplicado!\n\n`
          text += `O valor final fica *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        } else if (extraDiscountPercent > 0) {
          text += `\n\n🎁 *EXCLUSIVO:* Eu consegui liberar um **DESCONTO EXTRA de ${extraDiscountPercent}%** para fechar agora!\n\n`
          text += `É deu a louca no gerente! O valor final fica só *R$ ${totalFinal.toFixed(2).replace(".", ",")}*!`
        }
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

  // Formatar porcentagem (mostra inteiro se for inteiro, senão 1 casa decimal)
  const formatDiscountPercent = (percent: number) => {
    return percent % 1 === 0 ? percent.toString() : percent.toFixed(1)
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

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!composition || !mounted) {
    return null
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2"
          style={{ zIndex: 99999, position: 'fixed' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-[1100px] max-h-[95vh] neon-card rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ zIndex: 10000 }}
          >
        {/* Header */}
        <div 
          className="p-4 border-b-2 border-indigo-500/50"
          style={{
            background: 'linear-gradient(to right, #000000 0%, #1e3a8a 25%, #4169E1 50%, #1e3a8a 75%, #000000 100%)'
          }}
        >
          <div className="flex items-center justify-between">
          <div>
              <h2 
                className="text-2xl font-bold mb-2 font-heading" 
                style={{ 
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff'
                } as React.CSSProperties}
              >
                Cockpit de Vendas
              </h2>
              <p 
                className="text-sm font-medium" 
                style={{ 
                  color: '#ffffff',
                  WebkitTextFillColor: '#ffffff'
                } as React.CSSProperties}
              >
                {composition.customerName} • {formatPhoneNumber(composition.customerWhatsapp)}
            </p>
          </div>
            
            {/* Botão Fechar */}
          <button
            onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          </div>
        </div>

        {/* Content - 3 Colunas */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0" style={{ minHeight: 0 }}>
          {/* Coluna Esquerda - Imagem */}
          <div className="flex-shrink-0 relative flex items-center justify-center" style={{ width: '33%', minWidth: 0, maxWidth: '33%', backgroundColor: '#000', minHeight: '100%' }}>
          <div 
              className="relative w-full"
            style={{ 
              aspectRatio: '9/16',
                maxHeight: '100%'
            }}
          >
            <Image
              src={composition.imagemUrl}
              alt={composition.produtoNome || "Composição"}
              fill
                className="object-cover"
              unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          </div>

          {/* Coluna Meio - Análise IA */}
          <div className="flex-shrink-0 p-3 overflow-y-auto bg-[var(--bg-card)] border-x-2 border-indigo-500/30" style={{ width: '26.5%', minWidth: 0, maxWidth: '26.5%' }}>
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-3 border border-indigo-500/50 h-full">
              <h3 className="text-sm font-semibold text-[var(--text-main)] mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Análise IA
              </h3>
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {isLoading ? "Analisando cliente e produtos..." : aiAnalysis || "Gerando análise baseada nos produtos selecionados..."}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Painel Operacional */}
          <div className="flex-shrink-0 p-4 overflow-y-auto bg-[var(--bg-card)]" style={{ width: '40.5%', minWidth: 0, maxWidth: '40.5%' }}>
            <div className="space-y-4">
              {/* Produtos Identificados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--text-main)]">Produtos Identificados:</h4>
                  <span className="text-xs text-indigo-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Clique para selecionar
                  </span>
                </div>
                
                {isLoading ? (
                  <div className="text-xs text-[var(--text-secondary)] p-2">Carregando produtos...</div>
                ) : products.length === 0 ? (
                  <div className="text-xs text-[var(--text-secondary)] p-2 neon-card rounded border-indigo-500/30">
                    Nenhum produto identificado nesta imagem.
                  </div>
                ) : (
                  <div className="max-h-[250px] overflow-y-auto mb-2 border border-gray-300 rounded-lg p-2">
                    <div className="space-y-2">
                      {products.map((prod) => {
                        const isSelected = selectedProductIds.has(prod.id)
                        
                        return (
                          <div
                            key={prod.id}
                            onClick={() => toggleProductSelection(prod.id)}
                            className={`relative flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all min-h-[90px] ${
                              isSelected
                                ? "border-indigo-500 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-lg shadow-indigo-500/30 opacity-100"
                                : "border-gray-600 bg-[#2b2b40] opacity-60 hover:opacity-80 hover:border-gray-500"
                            }`}
                          >
                            {/* Indicador de Seleção - Check no canto superior esquerdo */}
                            {isSelected && (
                              <div className="absolute -top-2 -left-2 z-10 bg-indigo-500 rounded-full p-1 shadow-lg border-2 border-[var(--bg-card)]">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              </div>
                            )}
                            
                            {/* Botão para desmarcar - X vermelho no canto superior direito */}
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleProductSelection(prod.id)
                                }}
                                className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 rounded-full p-1 shadow-lg border-2 border-[var(--bg-card)] transition-colors"
                                aria-label="Desmarcar produto"
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            )}
                            
                          {/* Imagem do Produto */}
                          {prod.image ? (
                              <div className={`relative w-[70px] h-[70px] rounded flex-shrink-0 mr-3 bg-black overflow-hidden border-2 ${
                                isSelected ? "border-indigo-400 ring-2 ring-indigo-500/50" : "border-gray-600"
                              }`}>
                              <Image
                                src={prod.image}
                                alt={prod.name}
                                fill
                                  className={`object-cover transition-all ${
                                    isSelected ? "brightness-110" : "brightness-75"
                                  }`}
                                unoptimized
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                                {/* Overlay sutil quando selecionado */}
                                {isSelected && (
                                  <div className="absolute inset-0 bg-indigo-500/10 flex items-end justify-end p-1">
                                    <div className="bg-indigo-500 rounded-full p-0.5">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                )}
                            </div>
                          ) : (
                              <div className={`w-[70px] h-[70px] rounded flex-shrink-0 mr-3 flex items-center justify-center border-2 ${
                                isSelected ? "bg-indigo-500/30 border-indigo-400" : "bg-zinc-700 border-gray-600"
                              }`}>
                                {isSelected ? (
                                  <CheckCircle2 className="h-6 w-6 text-indigo-300" />
                                ) : (
                              <span className="text-[10px] text-gray-400 text-center px-1">Sem foto</span>
                                )}
                            </div>
                          )}
                          
                            {/* Detalhes */}
                            <div className="flex-1 min-w-0 pr-2">
                              <div className={`font-bold text-sm mb-1 break-words line-clamp-2 flex items-center gap-1 ${
                                isSelected ? "text-white" : "text-gray-300"
                              }`}>
                                {isSelected && (
                                  <Check className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                                )}
                                {prod.name}
                              </div>
                              <div className={`text-[10px] ${
                                isSelected ? "text-indigo-200" : "text-gray-400"
                              }`}>
                                Tam: {prod.size}
                              </div>
                            </div>

                            {/* Preços */}
                            <div className="text-right flex-shrink-0">
                              {prod.hasStoreDiscount && (
                                <div className={`text-[10px] line-through mb-0.5 ${
                                  isSelected ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  {formatPrice(prod.originalPrice)}
                                </div>
                              )}
                              <div className={`text-sm font-bold whitespace-nowrap ${
                                isSelected ? "text-green-400" : "text-white"
                              }`}>
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
                        // Salvar desconto extra para esta composição específica
                        if (composition?.id) {
                          const storageKey = `cockpit-extra-discount-${composition.id}`
                          localStorage.setItem(storageKey, value.toString())
                        }
                    }}
                    min="0"
                    max="100"
                    className="flex-1 px-3 py-1.5 bg-[var(--bg-card)] border-2 border-indigo-500/30 rounded-lg text-[var(--text-main)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                    placeholder="0"
                  />
                  <button
                    onClick={() => {
                      // Salvar desconto extra para esta composição específica
                      if (composition?.id) {
                        const storageKey = `cockpit-extra-discount-${composition.id}`
                        localStorage.setItem(storageKey, extraDiscountPercent.toString())
                      }
                      updatePricesAndTotal()
                      generateAIAnalysis() // Atualizar análise quando aplicar desconto
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg font-semibold transition-all text-xs flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Aplicar
                  </button>
                </div>
                
                {/* Resumo Financeiro Completo */}
                <div className="bg-[#151520] p-3 rounded-lg space-y-2">
                  {/* Total sem Desconto */}
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Total sem Desconto:</span>
                    <span className="font-medium">{formatPrice(totalOriginal)}</span>
                  </div>
                  
                  {/* Descontos Aplicados - Organizados */}
                  {(socialMediaDiscount > 0 || extraDiscountPercent > 0) && (
                    <>
                      <div className="pt-2 border-t border-gray-700">
                        <div className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide">Descontos Aplicados:</div>
                        {socialMediaDiscount > 0 && (
                          <div className="flex justify-between text-xs text-gray-300 mb-1">
                            <span>• Redes Sociais:</span>
                            <span className="text-green-400 font-medium">{socialMediaDiscount}%</span>
                          </div>
                        )}
                        {extraDiscountPercent > 0 && (
                          <div className="flex justify-between text-xs text-gray-300 mb-1">
                            <span>• Desconto Extra:</span>
                            <span className="text-orange-400 font-medium">{extraDiscountPercent}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-semibold text-white mt-1.5 pt-1.5 border-t border-gray-700">
                          <span>Desconto Total:</span>
                          <span className="text-green-400">{formatDiscountPercent(totalDiscountPercent)}%</span>
                        </div>
                      </div>
                      
                      {/* Valor do Desconto em Reais */}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-red-400 pt-1 border-t border-gray-700">
                          <span>Desconto ({formatDiscountPercent(totalDiscountPercent)}%):</span>
                          <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Total Final */}
                  <div className="flex justify-between pt-2 border-t-2 border-gray-600 text-sm font-bold text-white">
                    <span>Total com Desconto:</span>
                    <span className="text-green-400 text-base">{formatPrice(totalFinal)}</span>
                  </div>
                </div>
              </div>

              {/* Área de Ações */}
              <div className="space-y-2 pt-2 border-t-2 border-indigo-500/50 group">
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
                  className="btn-enviar-proposta w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base group-hover:cursor-pointer"
                  style={{ 
                    backgroundColor: !composition.customerWhatsapp || !whatsappMessage.trim() ? '#9ca3af' : '#22c55e',
                    background: !composition.customerWhatsapp || !whatsappMessage.trim() ? '#9ca3af' : '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#16a34a'
                      e.currentTarget.style.background = '#16a34a'
                      e.currentTarget.style.cursor = 'pointer'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = '#22c55e'
                      e.currentTarget.style.background = '#22c55e'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                >
                  <MessageCircle className="h-5 w-5" style={{ color: '#ffffff', fill: 'none', stroke: '#ffffff' }} />
                  <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>Enviar Proposta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
