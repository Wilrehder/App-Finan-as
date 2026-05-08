"use client"

import { FileDown, Loader2 } from "lucide-react"
import { useState } from "react"

interface Transaction {
  id: string
  description: string
  category: string
  amount: number
  type: "income" | "expense"
  transaction_date: string
  recurring_id?: string | null
}

interface ExportPdfButtonProps {
  transactions: Transaction[]
  income: number
  expense: number
  balance: number
  periodLabel: string // ex: "Maio/2026"
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

export function ExportPdfButton({ transactions, income, expense, balance, periodLabel }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)

    const incomeRows = transactions
      .filter((t) => t.type === "income")
      .map(
        (t) =>
          `<tr>
            <td>${formatDate(t.transaction_date)}</td>
            <td>${t.description}</td>
            <td>${t.category}</td>
            <td style="color:#22c55e;font-weight:600">+ ${formatBRL(Number(t.amount))}</td>
          </tr>`
      )
      .join("")

    const expenseRows = transactions
      .filter((t) => t.type === "expense")
      .map(
        (t) =>
          `<tr>
            <td>${formatDate(t.transaction_date)}</td>
            <td>${t.description}</td>
            <td>${t.category}</td>
            <td style="color:#ef4444;font-weight:600">- ${formatBRL(Number(t.amount))}</td>
          </tr>`
      )
      .join("")

    const allRows = transactions
      .map(
        (t) =>
          `<tr>
            <td>${formatDate(t.transaction_date)}</td>
            <td>${t.description}${t.recurring_id ? " 🔄" : ""}</td>
            <td>${t.category}</td>
            <td style="color:${t.type === "income" ? "#22c55e" : "#ef4444"};font-weight:600">
              ${t.type === "income" ? "+" : "-"} ${formatBRL(Number(t.amount))}
            </td>
          </tr>`
      )
      .join("")

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Extrato ${periodLabel} — Finchat</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; }
          header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
          h1 { font-size: 24px; font-weight: 700; }
          .subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .period { font-size: 13px; font-weight: 600; background: #f3f4f6; padding: 4px 12px; border-radius: 99px; }
          .summary { display: flex; gap: 16px; margin-bottom: 32px; }
          .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
          .card-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
          .card-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
          .green { color: #22c55e; }
          .red   { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f9fafb; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
          td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          .section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.07em; margin: 24px 0 8px; }
          footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Finchat — Extrato Financeiro</h1>
            <p class="subtitle">Relatório de movimentações do período</p>
          </div>
          <span class="period">${periodLabel}</span>
        </header>

        <div class="summary">
          <div class="card">
            <div class="card-label">Receitas</div>
            <div class="card-value green">${formatBRL(income)}</div>
          </div>
          <div class="card">
            <div class="card-label">Despesas</div>
            <div class="card-value red">${formatBRL(expense)}</div>
          </div>
          <div class="card">
            <div class="card-label">Saldo</div>
            <div class="card-value ${balance >= 0 ? "green" : "red"}">${formatBRL(balance)}</div>
          </div>
        </div>

        <p class="section-title">Todas as Movimentações (${transactions.length})</p>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${allRows || "<tr><td colspan='4' style='text-align:center;color:#9ca3af;padding:24px'>Nenhuma transação neste período</td></tr>"}
          </tbody>
        </table>

        <footer>
          Gerado por Finchat em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          &nbsp;|&nbsp; 🔄 = Conta Fixa Recorrente
        </footer>
      </body>
      </html>
    `

    const win = window.open("", "_blank")
    if (!win) {
      alert("Permita pop-ups para exportar o PDF.")
      setLoading(false)
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      setLoading(false)
    }, 500)
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
      title="Exportar extrato em PDF"
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin text-primary" />
      ) : (
        <FileDown size={18} className="text-primary" />
      )}
    </button>
  )
}
