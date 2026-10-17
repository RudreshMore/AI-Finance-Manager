import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { AppNavbar } from '../../components/layout/AppNavbar';
import {
  AiApiService,
  type ChatMessage,
  type AiStatusResponse,
  type MonthlySummaryResponse,
} from '../../services/ai.service';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Trash2,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart,
  Target,
  ArrowRight,
  Database,
  HelpCircle,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'Am I on track with my budgets?',
  'Compare this month\'s spending to last month',
  'How are my savings goals progressing?',
  'What are my top spending categories?',
  'What is the total balance across my accounts?',
];

export const AiAssistantPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'monthly'>('chat');
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your **AI Financial Assistant**.\n\nI have read-only access to your financial records and can help you analyze spending, monitor budget adherence, track savings goals, and find opportunities to save.\n\nHow can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Monthly Summary State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Initial data load: check status and load monthly summary
  useEffect(() => {
    loadStatus();
    loadMonthlySummary(selectedMonth, selectedYear);
  }, []);

  const loadStatus = async () => {
    try {
      const status = await AiApiService.getStatus();
      setAiStatus(status);
    } catch (err: any) {
      console.error('Failed to load AI status:', err);
    }
  };

  const loadMonthlySummary = async (month: number, year: number) => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await AiApiService.getMonthlySummary(month, year);
      setMonthlyData(data);
    } catch (err: any) {
      setSummaryError(err.response?.data?.message || 'Failed to load monthly summary');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsSending(true);
    setChatError(null);

    // Prepare history payload (excluding initial greeting to save tokens)
    const historyPayload = updatedMessages
      .filter((m) => m !== messages[0])
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const response = await AiApiService.sendMessage(textToSend.trim(), historyPayload);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.response,
        toolsUsed: response.toolsUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updatedMessages, assistantMsg]);
    } catch (err: any) {
      setChatError(
        err.response?.data?.message || 'Unable to connect to the AI Financial Assistant.'
      );
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content:
          '⚠️ **Error:** I encountered an issue retrieving your financial records. Please check your connection or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Conversation reset. Feel free to ask any question about your spending, accounts, budgets, or savings goals.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatError(null);
  };

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  Phase 5: Secure AI Financial Assistant
                </span>
                {aiStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Gemini Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-900/60 text-amber-200 border border-amber-700/50">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    API Key Not Configured
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                AI Financial Assistant & Intelligence
              </h1>
              <p className="mt-2 text-slate-300 text-sm max-w-2xl">
                Personalized financial analysis grounded exclusively in your real financial data.
                Ask natural questions about spending, compare periods, track budget health, and receive actionable savings advice.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'chat'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Bot className="h-4 w-4" />
                <span>AI Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === 'monthly'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span>Monthly Insights</span>
              </button>
            </div>
          </div>
        </div>

        {/* API Key Not Configured Advisory Banner */}
        {aiStatus && !aiStatus.configured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-amber-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">
                  Gemini API Key is not configured in server/.env
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The AI Assistant is operating with deterministic fallback data. To unlock full natural language reasoning, add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">GEMINI_API_KEY</code> to your backend environment file.
                </p>
              </div>
            </div>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex-shrink-0"
            >
              <span>Get API Key</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* TAB 1: AI CHAT ASSISTANT */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Column (3 cols) */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
              {/* Chat Sub-Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Finance Advisor Chat</h3>
                    <p className="text-[11px] text-slate-500">
                      Strict Read-Only &bull; Grounded in Personal Ledger
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClearChat}
                  title="Clear Conversation"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isUser
                            ? 'bg-slate-800 text-white'
                            : 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        }`}
                      >
                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isUser
                            ? 'bg-slate-900 text-white rounded-tr-none'
                            : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none'
                        }`}
                      >
                        {/* Markdown Message Content */}
                        <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 text-inherit">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Tools Badge */}
                        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                            <Database className="h-3 w-3 text-emerald-600" />
                            <span className="font-semibold text-slate-600">Grounded tools:</span>
                            {msg.toolsUsed.map((tool) => (
                              <span
                                key={tool}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-[10px] text-emerald-700"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}

                        <div
                          className={`mt-1.5 text-[10px] ${
                            isUser ? 'text-slate-400 text-right' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading / Thinking Indicator */}
                {isSending && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-600 flex items-center gap-2 shadow-sm">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      <span>Querying financial data & formulating response...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error banner if chat error */}
              {chatError && (
                <div className="mx-4 mb-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about spending, budgets, comparison, or savings tips..."
                    disabled={isSending}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !inputMessage.trim()}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Side Column: Suggested Prompts & Security Rules (1 col) */}
            <div className="space-y-6">
              {/* Quick Prompt Suggestions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>Suggested Questions</span>
                </div>
                <div className="space-y-2">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isSending}
                      className="w-full text-left p-2.5 rounded-xl text-xs text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-100 transition duration-150 flex items-center justify-between group disabled:opacity-50"
                    >
                      <span className="line-clamp-2">{prompt}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 flex-shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Security & Architecture Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Security Architecture</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span><strong>100% Read-Only:</strong> AI cannot modify or delete transactions, accounts, or budgets.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span><strong>Identity Bound:</strong> User identity is verified strictly on the server session.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">&bull;</span>
                    <span><strong>Zero Direct SQL:</strong> The LLM accesses data exclusively through controlled services.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MONTHLY FINANCIAL INSIGHTS */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            {/* Filter and Date Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Monthly Analysis & Actionable Insights</h3>
                  <p className="text-xs text-slate-500">
                    Comprehensive overview with key metrics and tailored recommendations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setSelectedMonth(m);
                    loadMonthlySummary(m, selectedYear);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                  ].map((monthName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {monthName}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setSelectedYear(y);
                    loadMonthlySummary(selectedMonth, y);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => loadMonthlySummary(selectedMonth, selectedYear)}
                  disabled={isSummaryLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSummaryLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {summaryError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                <span>{summaryError}</span>
              </div>
            )}

            {/* Key Metrics Cards */}
            {monthlyData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Income */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Total Income</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(monthlyData.metrics.totalIncome)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Period total credits</p>
                </div>

                {/* Total Expenses */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Total Expenses</span>
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(monthlyData.metrics.totalExpenses)}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Top: {monthlyData.metrics.topExpenseCategory || 'None'}
                  </p>
                </div>

                {/* Net Savings & Rate */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Net Cash Flow</span>
                    <PiggyBank className="h-4 w-4 text-blue-600" />
                  </div>
                  <div
                    className={`text-xl font-extrabold ${
                      parseFloat(monthlyData.metrics.netCashFlow) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatCurrency(monthlyData.metrics.netCashFlow)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Savings Rate: <span className="font-semibold">{monthlyData.metrics.savingsRate}%</span>
                  </p>
                </div>

                {/* Budget Utilization */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Budget Adherence</span>
                    <Target className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    {monthlyData.metrics.budgetUtilizationPercent}%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Active Goals: <span className="font-semibold">{monthlyData.metrics.activeGoalsCount}</span>
                  </p>
                </div>
              </div>
            )}

            {/* AI Executive Summary & Recommendations Card */}
            {monthlyData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Executive Summary (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Executive Financial Summary &bull; {monthlyData.period.label}
                    </h3>
                  </div>

                  <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-p:leading-relaxed">
                    <ReactMarkdown>{monthlyData.summary}</ReactMarkdown>
                  </div>
                </div>

                {/* Recommendations (1 col) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <h3 className="text-base font-bold text-slate-900">Actionable Advice</h3>
                  </div>

                  <div className="space-y-3">
                    {monthlyData.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 flex items-start gap-3"
                      >
                        <div className="h-6 w-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0 text-xs mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        AI Finance Manager &bull; Phase 5: Secure AI Financial Assistant &bull; Powered by Google Gemini
      </footer>
    </div>
  );
};
