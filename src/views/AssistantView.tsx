import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tender } from '../types';
import { Answer, AnswerBlock, AssistantData, TableColumn, TableRow } from '../assistant/types';
import { ask, exampleQuestions } from '../assistant/answer';
import { STAGE_STEPS, getStageBadgeColor, getStageStepIndex } from '../utils/tenderUtils';
import { ArrowRight, Download, MessageSquare, RotateCcw, Send } from 'lucide-react';

export interface ChatMessage {
  id: string;
  question: string;
  answer: Answer;
}

interface AssistantViewProps {
  data: AssistantData;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  onOpenTender: (tender: Tender) => void;
}

const ROWS_SHOWN = 10;

/** Text with **bold** parts. */
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-slate-900">
          {part}
        </strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )}
  </>
);

function downloadCsv(columns: TableColumn[], rows: TableRow[], name: string) {
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [columns.map((c) => escape(c.label)).join(','), ...rows.map((row) => columns.map((c) => escape(row.cells[c.key])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const AnswerTable: React.FC<{
  block: Extract<AnswerBlock, { type: 'table' }>;
  onOpenRow: (srNo: number) => void;
}> = ({ block, onOpenRow }) => {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? block.rows : block.rows.slice(0, ROWS_SHOWN);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-700">
          {block.title || `${block.rows.length} ${block.rows.length === 1 ? 'row' : 'rows'}`}
        </span>
        <button
          type="button"
          onClick={() => downloadCsv(block.columns, block.rows, (block.title || 'tenders').replace(/[^a-z0-9]+/gi, '_'))}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3 h-3" />
          <span>CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-slate-600 border-b border-slate-200">
              {block.columns.map((column) => (
                <th key={column.key} className={`py-2 px-3 font-semibold whitespace-nowrap ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row, index) => (
              <tr
                key={index}
                onClick={row.srNo ? () => onOpenRow(row.srNo!) : undefined}
                className={row.srNo ? 'hover:bg-blue-50/60 cursor-pointer' : ''}
              >
                {block.columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={`py-2 px-3 ${column.align === 'right' ? 'text-right font-mono whitespace-nowrap' : ''} ${
                      column.mono ? 'font-mono text-[11px] whitespace-nowrap' : ''
                    } ${columnIndex === 0 && row.srNo ? 'font-bold text-blue-700' : ''} ${
                      column.key === 'item' || column.key === 'remarks' || column.key === 'reason' ? 'max-w-xs truncate' : ''
                    }`}
                    title={column.key === 'item' || column.key === 'remarks' || column.key === 'reason' ? String(row.cells[column.key] ?? '') : undefined}
                  >
                    {row.cells[column.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.rows.length > ROWS_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border-t border-slate-200 cursor-pointer"
        >
          {showAll ? 'Show fewer' : `Show all ${block.rows.length}`}
        </button>
      )}
    </div>
  );
};

const TenderHeader: React.FC<{ tender: Tender; onOpen: () => void }> = ({ tender, onOpen }) => {
  const badge = getStageBadgeColor(tender.brief_status);
  const stepIndex = getStageStepIndex(tender.brief_status);
  const awarded = tender.brief_status === 'Awarded';

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">{tender.pr_no}</span>
            {tender.crfq_no && <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 border border-slate-200">{tender.crfq_no}</span>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
              {tender.brief_status}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{tender.tender_type}</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{tender.user_function}</span>
          </div>
          <div className="text-sm font-bold text-slate-900">{tender.item_description}</div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stage progress */}
      {tender.brief_status !== 'Cancelled' && (
        <div className="flex items-center gap-1" title={tender.brief_status}>
          {STAGE_STEPS.map((stage, index) => (
            <div
              key={stage}
              className={`h-1.5 flex-1 rounded-full ${
                awarded || index < stepIndex ? 'bg-emerald-500' : index === stepIndex ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

const Blocks: React.FC<{ answer: Answer; tenders: Tender[]; onOpenTender: (tender: Tender) => void }> = ({ answer, tenders, onOpenTender }) => {
  const open = (srNo: number) => {
    const tender = tenders.find((t) => t.sr_no === srNo);
    if (tender) onOpenTender(tender);
  };

  return (
    <>
      {answer.blocks.map((block, index) => {
        switch (block.type) {
          case 'text':
            return (
              <p key={index} className="text-sm text-slate-700 leading-relaxed">
                <Rich text={block.text} />
              </p>
            );
          case 'stats':
            return (
              <div key={index} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {block.items.map((item) => (
                  <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-0">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase truncate">{item.label}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5 break-words">{item.value}</div>
                  </div>
                ))}
              </div>
            );
          case 'bars': {
            const max = Math.max(...block.items.map((item) => item.value), 0);
            return (
              <div key={index} className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                {block.title && <div className="text-xs font-bold text-slate-700 mb-2">{block.title}</div>}
                {block.items.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className="w-28 sm:w-44 shrink-0 truncate text-slate-700" title={item.label}>
                      {item.label}
                    </span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded">
                      <div className="h-full bg-blue-500 rounded" style={{ width: `${max > 0 ? Math.max(1.5, (item.value / max) * 100) : 0}%` }}></div>
                    </div>
                    <span className="w-24 sm:w-28 shrink-0 text-right font-mono font-semibold text-slate-800">{item.display}</span>
                  </div>
                ))}
              </div>
            );
          }
          case 'list':
            return (
              <div key={index} className="border border-slate-200 rounded-lg p-3">
                {block.title && <div className="text-xs font-bold text-slate-700 mb-2">{block.title}</div>}
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <Rich text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          case 'table':
            return <AnswerTable key={index} block={block} onOpenRow={open} />;
          case 'tender': {
            const tender = tenders.find((t) => t.sr_no === block.srNo);
            return tender ? <TenderHeader key={index} tender={tender} onOpen={() => onOpenTender(tender)} /> : null;
          }
        }
      })}
    </>
  );
};

export const AssistantView: React.FC<AssistantViewProps> = ({ data, messages, onMessagesChange, onOpenTender }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const examples = useMemo(() => exampleQuestions(data), [data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = (text: string) => {
    const question = text.trim();
    if (!question) return;
    // A follow-up ("by officer", "only group 2") works on the tenders of the previous answer
    const previous = messages[messages.length - 1]?.answer.filters;
    onMessagesChange([...messages, { id: `q-${Date.now()}`, question, answer: ask(question, data, previous) }]);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-7rem)] max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
            <MessageSquare className="w-5 h-5" />
          </span>
          <h2 className="text-base font-bold text-slate-800 leading-tight">Assistant</h2>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => onMessagesChange([])}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => submit(example)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 border border-slate-200 rounded-full cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-blue-600 text-white text-sm font-medium">{message.question}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
              {message.answer.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {message.answer.chips.map((chip) => (
                    <span key={chip} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <Blocks answer={message.answer} tenders={data.tenders} onOpenTender={onOpenTender} />
              {index === messages.length - 1 && message.answer.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {message.answer.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submit(suggestion)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* Question box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-0 pt-2 pb-1 bg-slate-100"
      >
        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Up arrow brings back the last question
              if (e.key === 'ArrowUp' && !input && messages.length > 0) setInput(messages[messages.length - 1].question);
            }}
            placeholder="Ask about tenders"
            aria-label="Question"
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="p-2 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg cursor-pointer disabled:cursor-default"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
