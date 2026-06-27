'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { Check, Copy } from 'lucide-react'

interface Relatorio {
  id: string
  cliente_nome: string
  periodo_inicio: string
  periodo_fim: string
  conteudo: string
  criado_em: string
}

export default function RelatorioPublicoPage({
  params,
}: {
  params: { id: string }
}) {
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const fetchRelatorio = async () => {
      
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!error && data) {
        setRelatorio(data)
      }
      setLoading(false)
    }

    fetchRelatorio()
  }, [params.id])

  const copiarLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Carregando relatório...</p>
      </div>
    )
  }

  if (!relatorio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Relatório não encontrado.</p>
      </div>
    )
  }

  const periodoInicio = new Date(relatorio.periodo_inicio).toLocaleDateString('pt-BR')
  const periodoFim = new Date(relatorio.periodo_fim).toLocaleDateString('pt-BR')

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                Relatório de Performance
              </p>
              <h1 className="text-xl font-semibold text-gray-900">
                {relatorio.cliente_nome}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {periodoInicio} — {periodoFim}
              </p>
            </div>
            <button
              onClick={copiarLink}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shrink-0"
            >
              {copiado ? (
                <>
                  <Check size={15} className="text-green-500" />
                  <span className="text-green-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copiar link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: relatorio.conteudo }}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Growthwave · growthwave.contato@gmail.com
        </p>
      </div>
    </div>
  )
}