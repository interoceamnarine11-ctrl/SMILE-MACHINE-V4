import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  HelpCircle, 
  Code2, 
  FileText, 
  Eye, 
  Database, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  BookOpen, 
  Wand2,
  RefreshCw,
  Info,
  Maximize2,
  ChevronRight,
  Calculator,
  SlidersHorizontal,
  Table,
  Terminal
} from 'lucide-react';
import { evaluateGMergeTemplate, formatGMergeDate } from '../services/gmergeEngine';

interface GMergeStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToEditor?: (text: string) => void;
  showToast: (msg: string) => void;
}

export const GMergeStudioModal: React.FC<GMergeStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertToEditor,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'cheatsheet' | 'docs'>('tester');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Tester State
  const [testTemplate, setTestTemplate] = useState<string>(
`Hello [[-FirstName-:Valued Partner]],

Thank you for your partnership with [[-Company-:our global network]].
Your message index is #[[-Index-]] and your current order date is [[-Now-:MM D, yy]].

[[if Tier="Gold"]]
★ VIP Gold Partner: You qualify for an exclusive [[20 + 5]]% procurement rebate!
[[elseif Tier="Silver"]]
◆ Silver Partner: You qualify for a 15% discount on shipping.
[[else]]
● Standard Partner: Welcome to our global trade group.
[[endif]]

Package Status: [[Status|1|Processing|2|Shipped|3|Delivered|Pending Review]]
Registered Contact: [[convert_lower_case(-Email-)]]
Renewal Due: [[-Now- + 30:MM D, yy]] (in [[(-Now- + 30) - -Now-]] days)

Best regards,
Acme Global Logistics`
  );

  // Mock Recipient State for Testing
  const [mockRecipient, setMockRecipient] = useState({
    firstName: 'Alexander',
    lastName: 'Wright',
    fullName: 'Alexander Wright',
    email: 'alexander.wright@industry-corp.de',
    company: 'Industry Corp Germany',
    country: 'Germany',
    city: 'Munich',
    Tier: 'Gold',
    Status: '2',
    radius: '10',
    gender: '1',
    customFields: {
      'purchase date': '09/15/2026',
      'order id': 'ORD-9841',
      'Color': '2'
    }
  });

  const [customFieldsJson, setCustomFieldsJson] = useState<string>(
    JSON.stringify(mockRecipient.customFields, null, 2)
  );

  // Live evaluation
  const evaluationResult = useMemo(() => {
    let parsedCustom: Record<string, any> = {};
    try {
      parsedCustom = JSON.parse(customFieldsJson);
    } catch {
      // fallback to mockRecipient.customFields
      parsedCustom = mockRecipient.customFields;
    }

    const start = performance.now();
    try {
      const output = evaluateGMergeTemplate(testTemplate, {
        recipient: {
          ...mockRecipient,
          customFields: parsedCustom,
          city: mockRecipient.city,
          Tier: mockRecipient.Tier,
          Status: mockRecipient.Status,
          radius: Number(mockRecipient.radius) || 10,
          gender: Number(mockRecipient.gender) || 1,
        },
        index: 1,
        now: new Date(),
        operationType: 1,
        tableId: 3742,
      });
      const end = performance.now();
      return {
        success: true,
        output,
        durationMs: (end - start).toFixed(2),
        error: null,
      };
    } catch (err: any) {
      return {
        success: false,
        output: '',
        durationMs: '0.00',
        error: err.message || 'Syntax error in G-Merge expression',
      };
    }
  }, [testTemplate, mockRecipient, customFieldsJson]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleInsert = (text: string) => {
    if (onInsertToEditor) {
      onInsertToEditor(text);
      showToast('Inserted into composer!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-900 border border-indigo-500/40 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 via-indigo-950/60 to-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/40">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
                  G-Merge Engine & Personalization Studio
                </h3>
                <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 text-[10px] font-bold rounded-full border border-indigo-500/40">
                  Full Mailer Syntax
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Variables, Math Expressions, Conditional Bodies, Date Formatting, Data Switching & Custom Functions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab navigation */}
            <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('tester')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'tester'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Live Tester
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cheatsheet')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'cheatsheet'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Token Palette
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'docs'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Syntax Manual
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: LIVE TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-6">
              {/* Presets and Quick actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-semibold">Load Template Preset:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        name: 'B2B Executive Pitch',
                        template: `Dear [[-FirstName-:Executive]],\n\nI noticed [[-Company-]] leads the sector in [[city]].\nOur platform will reduce your operational cycle by [[15 + 10]]% starting [[-Now-:MM D, yy]].\n\n[[if Tier="Gold"]]\nAs a premier enterprise, you receive priority SLA and custom routing.\n[[else]]\nWe would welcome 10 minutes to discuss collaboration with [[-Company-]].\n[[endif]]\n\nWarm regards,\n[[sender_name]]`
                      },
                      {
                        name: 'Data Switching & Math',
                        template: `Hello [[CustomerName]],\n\nYour order for a [[Color|1|red|2|blue|3|green|custom]] item has been confirmed!\nItem Quantity: [[var qty=3; qty]]\nUnit Price: $[[var price=45.50; price]]\nTotal Cost: $[[qty * price]]\nEarly Bird Discount: $[[round(qty * price * 0.1, 2)]]\nFinal Due: $[[qty * price - round(qty * price * 0.1, 2)]]\n\nEstimated Delivery: [[-Now- + 5:WW, MM D, yy]]`
                      },
                      {
                        name: 'Conditional Salutation',
                        template: `Dear [[if gender=1]]Sir[[elseif gender=2]]Madam[[else]]Valued Customer[[endif]],\n\nYour account [[-Email-]] with ID #[[-TID-]] is active.\nRegistered domain: [[-Domain-]]\nAccount Holder: [[-FullName-:Account Manager]]\nProcessed on: [[-Now-:m/d/y @]]`
                      }
                    ].map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setTestTemplate(preset.template)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 font-medium transition-all"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {onInsertToEditor && (
                  <button
                    type="button"
                    onClick={() => handleInsert(testTemplate)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Insert Script into Composer
                  </button>
                )}
              </div>

              {/* Grid: Editor on Left, Live Output & Context on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Editor Column */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-400" />
                      G-Merge Source Code
                    </label>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Statements in <code className="text-indigo-400">{'[['}...{']]'}</code>
                    </span>
                  </div>

                  <textarea
                    rows={16}
                    value={testTemplate}
                    onChange={(e) => setTestTemplate(e.target.value)}
                    placeholder="Enter G-Merge statements..."
                    className="w-full p-3.5 bg-gray-950 border border-gray-700 focus:border-indigo-500 rounded-xl text-xs sm:text-sm text-indigo-200 font-mono leading-relaxed focus:outline-none transition-all resize-y shadow-inner"
                    spellCheck={false}
                  />

                  {/* Quick token insert buttons below editor */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      '[[-FirstName-:Customer]]',
                      '[[-Company-]]',
                      '[[-Now-:MM D, yy]]',
                      '[[if Tier="Gold"]]...[[else]]...[[endif]]',
                      '[[Status|1|Active|2|Pending|Unknown]]',
                      '[[convert_lower_case(-Email-)]]',
                      '[[2 * 3.14159 * radius]]'
                    ].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setTestTemplate(prev => prev + ' ' + tok)}
                        className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-mono rounded border border-gray-700 transition-all"
                      >
                        +{tok.slice(0, 20)}...
                      </button>
                    ))}
                  </div>
                </div>

                {/* Output & Context Column */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Evaluated Output Card */}
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Evaluated Live Output
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">
                          Parsed in {evaluationResult.durationMs}ms
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(evaluationResult.output, 'output')}
                          className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-all"
                          title="Copy evaluated output"
                        >
                          {copiedCode === 'output' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {evaluationResult.error ? (
                      <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-300 text-xs font-mono">
                        {evaluationResult.error}
                      </div>
                    ) : (
                      <pre className="p-3 bg-gray-900/90 rounded-lg border border-gray-800/80 text-xs sm:text-sm text-gray-200 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                        {evaluationResult.output || '(Template evaluated to empty output)'}
                      </pre>
                    )}
                  </div>

                  {/* Mock Recipient & Field Adjuster */}
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-white">Mock Lead & Database Record</span>
                      </div>
                      <span className="text-[10px] text-gray-400">Modify values to test conditionals</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">First Name</label>
                        <input
                          type="text"
                          value={mockRecipient.firstName}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Company</label>
                        <input
                          type="text"
                          value={mockRecipient.company}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, company: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Email Address</label>
                        <input
                          type="text"
                          value={mockRecipient.email}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Tier (Gold / Silver / etc.)</label>
                        <input
                          type="text"
                          value={mockRecipient.Tier}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, Tier: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Status Code (1, 2, 3)</label>
                        <input
                          type="text"
                          value={mockRecipient.Status}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, Status: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Radius (Math)</label>
                        <input
                          type="text"
                          value={mockRecipient.radius}
                          onChange={(e) => setMockRecipient(prev => ({ ...prev, radius: e.target.value }))}
                          className="w-full px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">
                        Custom Database Columns (JSON - e.g. {'{purchase date}'}):
                      </label>
                      <textarea
                        rows={3}
                        value={customFieldsJson}
                        onChange={(e) => setCustomFieldsJson(e.target.value)}
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-[11px] font-mono text-cyan-300 focus:border-indigo-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOKEN PALETTE & QUICK CHEATSHEET */}
          {activeTab === 'cheatsheet' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Predefined Variables */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Predefined Variables</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Built-in recipient attributes beginning and ending with dashes:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[-FirstName-]]', desc: 'Recipient first name' },
                      { token: '[[-LastName-]]', desc: 'Recipient last name' },
                      { token: '[[-FullName-]]', desc: 'Recipient full name' },
                      { token: '[[-Company-]]', desc: 'Company / Organization' },
                      { token: '[[-Domain-]]', desc: 'Account domain name' },
                      { token: '[[-Email-]]', desc: 'Clean email address' },
                      { token: '[[-Index-]]', desc: '1-based sequential index' },
                      { token: '[[-Now-]]', desc: 'Current date & time' },
                      { token: '[[-Recipient-]]', desc: 'Full compound string' },
                      { token: '[[-User-]]', desc: 'Account username' },
                      { token: '[[CR]]', desc: 'Carriage return / line break' },
                    ].map(item => (
                      <div key={item.token} className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded border border-gray-800">
                        <div>
                          <code className="text-indigo-300 font-bold">{item.token}</code>
                          <span className="text-[10px] text-gray-400 ml-2 font-sans">{item.desc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.token, item.token)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Defaults & Date Formats */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                    <Calendar className="w-4 h-4" />
                    <span>Defaults & Date Formats</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Substitute fallbacks with colons or format dates:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[-FirstName-:Customer]]', desc: 'Default if empty' },
                      { token: '[[City:Metropolis]]', desc: 'Fallback column default' },
                      { token: '[[-Now-:m/d/y]]', desc: 'e.g. 9/25/26' },
                      { token: '[[-Now-:mm/dd/yy]]', desc: 'e.g. 09/25/2026' },
                      { token: '[[-Now-:MM D, yy]]', desc: 'e.g. September 25th, 2026' },
                      { token: '[[-Now-:WW, M D]]', desc: 'e.g. Friday, Sep 25th' },
                      { token: '[[-Now-:h:ii:ss AP]]', desc: 'e.g. 2:15:30 p.m.' },
                      { token: '[[-Now-:~@]]', desc: 'Regional date and time' },
                      { token: '[[-Now- + 7:MM D, yy]]', desc: 'Date 7 days from now' },
                      { token: '[[#10/15/99#:M D, yy]]', desc: 'Date literal formatting' },
                    ].map(item => (
                      <div key={item.token} className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded border border-gray-800">
                        <div>
                          <code className="text-teal-300 font-bold">{item.token}</code>
                          <span className="text-[10px] text-gray-400 ml-2 font-sans">{item.desc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.token, item.token)}
                          className="text-gray-400 hover:text-white p-1"
                        >
                          {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Conditionals & Data Switching */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Conditionals & Switching</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Dynamic branching and lookup translation pairs:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[if gender=1]]Sir[[else]]Ma\'am[[endif]]', desc: 'Basic IF / ELSE' },
                      { token: '[[if country="Germany"]]Hallo[[elseif country="France"]]Bonjour[[else]]Hello[[endif]]', desc: 'Multi-branch IF' },
                      { token: '[[Color|1|red|2|blue|3|green]]', desc: 'Switch pairs' },
                      { token: '[[Color|1|red|2|blue|3|green|black]]', desc: 'Switch with default' },
                      { token: '[[if -FirstName-=""]]Friend[[else]][[-FirstName-]][[endif]]', desc: 'Conditional name check' },
                      { token: '[[if -Index- < 100]]Early Bird[[endif]]', desc: 'Index evaluation' },
                    ].map(item => (
                      <div key={item.token} className="bg-gray-900 p-2 rounded border border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-300/90 font-sans font-semibold">{item.desc}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.token, item.token)}
                            className="text-gray-400 hover:text-white p-0.5"
                          >
                            {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <code className="text-[11px] text-amber-200 block truncate">{item.token}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Math, Let & Compound Statements */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Calculator className="w-4 h-4" />
                    <span>Math, Let & Assignments</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Math operators (+, -, *, /, %, ^) and local let variables:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[2 * 3.14159 * radius]]', desc: 'Circumference math' },
                      { token: '[[(2 + 3) * 4]]', desc: 'Parenthesized precedence' },
                      { token: '[[var cost = 500, tax = 0.08; cost * (1 + tax)]]', desc: 'Declare & calculate' },
                      { token: '[[let total += 15]]', desc: 'Compound += assignment' },
                      { token: '[[let name += ", Jr."]]', desc: 'String concatenation let' },
                      { token: '[[12; 34]]', desc: 'Compound output "1234"' },
                      { token: '[[-Now- - order_date]]', desc: 'Difference in days between dates' },
                    ].map(item => (
                      <div key={item.token} className="bg-gray-900 p-2 rounded border border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-cyan-300/90 font-sans font-semibold">{item.desc}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.token, item.token)}
                            className="text-gray-400 hover:text-white p-0.5"
                          >
                            {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <code className="text-[11px] text-cyan-200 block truncate">{item.token}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Built-in Functions */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                    <Wand2 className="w-4 h-4" />
                    <span>Built-in Functions</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    G-Merge standard utility functions:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[convert_lower_case(CustomerEmail)]]', desc: 'Lowercase string' },
                      { token: '[[convert_upper_case(-Company-)]]', desc: 'Uppercase string' },
                      { token: '[[extract_first_name("John Doe")]]', desc: 'Extracts first name' },
                      { token: '[[extract_last_name("John Doe")]]', desc: 'Extracts last name' },
                      { token: '[[date_format(-Now-, "MM D, yy")]]', desc: 'Format date object' },
                      { token: '[[field_exists("phone")]]', desc: 'Check if column exists' },
                      { token: '[[round(3.14159, 2)]]', desc: 'Round to 2 decimal places' },
                      { token: '[[trim("  hello  ")]]', desc: 'Trim whitespace' },
                    ].map(item => (
                      <div key={item.token} className="bg-gray-900 p-2 rounded border border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-purple-300/90 font-sans font-semibold">{item.desc}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.token, item.token)}
                            className="text-gray-400 hover:text-white p-0.5"
                          >
                            {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <code className="text-[11px] text-purple-200 block truncate">{item.token}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Comments, Escapes & HTML */}
                <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4" />
                    <span>Comments, Escapes & Raw HTML</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Clean commenting and character escaping:
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { token: '[[[', desc: 'Escapes to literal "[["' },
                      { token: '[[var x=5; // line comment]]', desc: 'Single-line comment' },
                      { token: '[[/* level 1 /* level 2 */ level 1 */ 100]]', desc: 'Nested multi-line comments' },
                      { token: '[[var x=5; rem comment until end]]', desc: 'REM statement comment' },
                      { token: '[[if FALSE]]...[[endif]]', desc: 'Block comment out' },
                      { token: '[[raw "<span class=\'btn\'>Click</span>"]]', desc: 'Raw directive (no escaping)' },
                      { token: '[[{purchase date}]]', desc: 'Column name with spaces' },
                    ].map(item => (
                      <div key={item.token} className="bg-gray-900 p-2 rounded border border-gray-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-300/90 font-sans font-semibold">{item.desc}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.token, item.token)}
                            className="text-gray-400 hover:text-white p-0.5"
                          >
                            {copiedCode === item.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <code className="text-[11px] text-emerald-200 block truncate">{item.token}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FULL SYNTAX MANUAL & DOCUMENTATION */}
          {activeTab === 'docs' && (
            <div className="space-y-6 text-sm text-gray-300 leading-relaxed max-w-4xl mx-auto">
              {/* Introduction */}
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  G-Merge Mailer Specification & Architecture
                </h4>
                <p className="text-xs text-gray-300">
                  G-Merge statements are always enclosed in double brackets <code className="text-indigo-400 font-mono">[[...]]</code>. They allow embedding database columns, evaluating mathematical and logical expressions, performing data switching, formatting dates, defining user variables, and rendering conditional body content.
                </p>
              </div>

              {/* Data Types */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-sm">1. Supported Data Types</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                    <strong className="text-indigo-300">Number:</strong> 32-bit signed integer or 64-bit floating point number (e.g. <code className="text-gray-200">5</code>, <code className="text-gray-200">675.95</code>, <code className="text-gray-200">-12</code>).
                  </div>
                  <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                    <strong className="text-teal-300">Boolean:</strong> Binary literals <code className="text-gray-200">TRUE</code> and <code className="text-gray-200">FALSE</code> (case-insensitive).
                  </div>
                  <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                    <strong className="text-amber-300">String:</strong> Variable-length character string enclosed in double quotes. To represent a quote inside a string, double it: <code className="text-gray-200">"John ""The King"" Public"</code>.
                  </div>
                  <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                    <strong className="text-rose-300">Date:</strong> Date literals enclosed in hash symbols: <code className="text-gray-200">#10/15/1999#</code>, <code className="text-gray-200">#Oct 15 1999 14:06#</code>. American format (MM/DD/YYYY).
                  </div>
                </div>
              </div>

              {/* Operator Precedence */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-sm">2. Operator Precedence Hierarchy</h5>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between text-indigo-400 font-bold border-b border-gray-800 pb-1">
                    <span>Rank / Order</span>
                    <span>Operators</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>1. Highest (Parentheses & Functions)</span>
                    <span className="text-emerald-400">(...) , func(...)</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>2. Unary</span>
                    <span className="text-emerald-400">! (NOT), - (negation)</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>3. Exponential</span>
                    <span className="text-emerald-400">^</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>4. Multiplicative</span>
                    <span className="text-emerald-400">* , / , %</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>5. Additive & Concatenation</span>
                    <span className="text-emerald-400">+ , -</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>6. Relational & Equality</span>
                    <span className="text-emerald-400">= , != , &lt; , &lt;= , &gt;= , &gt;</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>7. Logical AND</span>
                    <span className="text-emerald-400">and</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>8. Lowest (Logical OR)</span>
                    <span className="text-emerald-400">or</span>
                  </div>
                </div>
              </div>

              {/* Date Formatting Characters Reference */}
              <div className="space-y-2">
                <h5 className="font-bold text-white text-sm">3. Date Format String Reference Table</h5>
                <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-900 border-b border-gray-800 text-gray-400">
                      <tr>
                        <th className="p-2.5">Character</th>
                        <th className="p-2.5">Meaning</th>
                        <th className="p-2.5">Example for Friday, March 5, 1995 1:02:03p</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-gray-300">
                      <tr><td className="p-2 text-teal-400">yy</td><td>Year, 4 numeric digits</td><td>1995</td></tr>
                      <tr><td className="p-2 text-teal-400">y</td><td>Year, 2 numeric digits</td><td>95</td></tr>
                      <tr><td className="p-2 text-teal-400">YY</td><td>Year, full text words</td><td>nineteen ninety five</td></tr>
                      <tr><td className="p-2 text-teal-400">Y</td><td>Year, 2-digit text words</td><td>ninety five</td></tr>
                      <tr><td className="p-2 text-teal-400">MM</td><td>Month, full text name</td><td>March</td></tr>
                      <tr><td className="p-2 text-teal-400">M</td><td>Month, 3-letter abbreviation</td><td>Mar</td></tr>
                      <tr><td className="p-2 text-teal-400">mm</td><td>Month, 2-digit numeric (01-12)</td><td>03</td></tr>
                      <tr><td className="p-2 text-teal-400">m</td><td>Month, 1-2 digit numeric</td><td>3</td></tr>
                      <tr><td className="p-2 text-teal-400">DD</td><td>Day, ordinal text</td><td>fifth</td></tr>
                      <tr><td className="p-2 text-teal-400">D</td><td>Day, ordinal number</td><td>5th</td></tr>
                      <tr><td className="p-2 text-teal-400">dd</td><td>Day, 2 digits (01-31)</td><td>05</td></tr>
                      <tr><td className="p-2 text-teal-400">d</td><td>Day, 1-2 digits</td><td>5</td></tr>
                      <tr><td className="p-2 text-teal-400">WW</td><td>Weekday, full text name</td><td>Friday</td></tr>
                      <tr><td className="p-2 text-teal-400">W</td><td>Weekday, 3-letter abbreviation</td><td>Fri</td></tr>
                      <tr><td className="p-2 text-teal-400">h / hh</td><td>Hours civilian 12h (1-12)</td><td>1 / 01</td></tr>
                      <tr><td className="p-2 text-teal-400">H / HH</td><td>Hours military 24h (0-23)</td><td>13</td></tr>
                      <tr><td className="p-2 text-teal-400">i / ii</td><td>Minutes (0-59 / 00-59)</td><td>2 / 02</td></tr>
                      <tr><td className="p-2 text-teal-400">s / ss</td><td>Seconds (0-59 / 00-59)</td><td>3 / 03</td></tr>
                      <tr><td className="p-2 text-teal-400">AP / ap</td><td>A.M. / P.M. designator</td><td>p.m. / p</td></tr>
                      <tr><td className="p-2 text-teal-400">b</td><td>Time zone bias</td><td>-0500</td></tr>
                      <tr><td className="p-2 text-teal-400">~ / @ / ~@</td><td>Regional Date / Time / Combined</td><td>8/3/2026 5:13:56 p.m.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Escaping & HTML */}
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2 text-xs">
                <h5 className="font-bold text-white text-sm">4. HTML & Escaping G-Merge Statements</h5>
                <p>
                  To escape the <code className="text-indigo-400 font-mono">[[</code> character sequence in message bodies, simply add another bracket: <code className="text-emerald-400 font-mono">[[[</code>. The parser outputs <code className="text-gray-200">[[</code> without attempting execution.
                </p>
                <p>
                  When sending rich HTML bodies, the statement can begin with the <code className="text-indigo-400 font-mono">raw</code> directive, e.g. <code className="text-emerald-400 font-mono">[[raw "&lt;b&gt;" + -Company- + "&lt;/b&gt;"]]</code>, ensuring Unicode text and markup remain pristine without canonicalization escapes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>G-Merge Engine v2.4 Active &bull; RFC-5322 Compliant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl transition-all"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
