'use client'

import { useState } from 'react'

export default function CopiarLinkButton() {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button
      onClick={copiar}
      style={{
        background: copiado ? "#064e3b" : "#27272a",
        border: "none",
        borderRadius: "8px",
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: "12px",
        color: copiado ? "#10b981" : "#a1a1aa",
        whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}
    >
      {copiado ? "✓ Copiado" : "Copiar link"}
    </button>
  )
}