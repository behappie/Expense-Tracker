import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Upload, Search, ListMinus, Copy, Lightbulb } from 'lucide-react';
import { ExpenseEntry } from './types';
import { processExpenseFile } from './services/ocrService';

export default function App() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newEntry, setNewEntry] = useState({ item: '', amount: '', date: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('isDarkMode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('isDarkMode', String(next));
      } catch {}
      return next;
    });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.item.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [expenses, searchTerm]);

  const total = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      const extractedExpenses = await processExpenseFile(file);
      const newExpenses = extractedExpenses.map((exp: any) => ({
        ...exp,
        id: Math.random().toString(36).substr(2, 9),
        date: exp.date || new Date().toISOString().split('T')[0]
      }));
      setExpenses((prev) => [...prev, ...newExpenses]);
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to process file.");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const addManualExpense = () => {
    if (!newEntry.item || !newEntry.amount) return;
    const numericAmount = parseFloat(newEntry.amount);
    if (isNaN(numericAmount)) return;

    const chosenDate = newEntry.date || new Date().toISOString().split('T')[0];
    setExpenses(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      item: newEntry.item,
      amount: numericAmount,
      date: chosenDate
    }]);
    setNewEntry({ item: '', amount: '', date: '' });
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
    setSelectedIds(prev => prev.filter(sId => sId !== id));
  };

  const bulkDeleteFiltered = () => {
    const filteredIds = new Set(filteredExpenses.map(exp => exp.id));
    setExpenses(expenses.filter(exp => !filteredIds.has(exp.id)));
    setSelectedIds([]);
    setSearchTerm('');
  };

  const copyTotal = () => {
    navigator.clipboard.writeText(total.toFixed(2));
    alert("Total copied to clipboard!");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id));
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]);
  };

  const deleteSelected = () => {
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected items?`)) {
      setExpenses(expenses.filter(exp => !selectedIds.includes(exp.id)));
      setSelectedIds([]);
    }
  };

  return (
    <div className={`min-h-screen p-6 font-sans select-none flex flex-col justify-between gap-6 transition-colors duration-300 ${
      isDarkMode ? "bg-[#0b0f19] text-[#e3edf7]" : "bg-[#e2f0fc] text-[#37474f]"
    }`}>
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* HEADER TOP BAR CARD */}
        <header className={`relative flex items-center justify-center p-6 rounded-3xl shadow-sm border transition-colors duration-300 ${
          isDarkMode ? "bg-[#161f30] border-[#223147]" : "bg-white border-[#bbdefb]"
        }`}>
          <h1 className="font-rampart text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-normal tracking-wide uppercase text-[#3a8ef6] text-center" style={{ textShadow: isDarkMode ? "1.5px 1.5px 0px rgba(58,142,246,0.3)" : "1.5px 1.5px 0px rgba(58,142,246,0.15)" }}>
            Expense OCR
          </h1>
          <button
            onClick={toggleDarkMode}
            className={`absolute right-6 p-2 rounded-full transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 shadow-md' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-500 border border-amber-200 shadow-sm'
            }`}
            aria-label="Toggle Dark Mode"
          >
            <Lightbulb size={24} className={isDarkMode ? "animate-pulse" : ""} fill={isDarkMode ? "currentColor" : "none"} />
          </button>
        </header>

        {/* BENTO GRID */}
        <div className="grid grid-cols-12 gap-6">
          {/* UPLOAD FILE CARD (LEFT) */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`col-span-12 md:col-span-4 border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center min-h-[250px] shadow-sm relative text-center transition-all duration-200 ${
              isDragging 
                ? (isDarkMode ? "border-[#2dd4bf] bg-[#1a2d42] scale-[1.02]" : "border-[#26a69a] bg-[#e0f1fe] scale-[1.02]") 
                : (isDarkMode ? "bg-[#161f30] border-[#223147]" : "bg-white border-[#a7ffeb]")
            }`}
          >
            <div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center transition-colors duration-300 ${
              isDarkMode ? "bg-[#112a2a] text-[#2dd4bf]" : "bg-[#e0f2f1] text-[#26a69a]"
            }`}>
              <Upload size={32} />
            </div>
            <h2 className="text-xl font-bold mb-0.5">Upload File</h2>
            <p className={`text-xl uppercase mb-4 font-semibold tracking-wider transition-colors duration-300 ${
              isDarkMode ? "text-[#64748b]" : "text-[#90a4ae]"
            }`}>PDF / Image</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#b5ead7] hover:bg-[#9de5cc] text-[#135c46] text-xl font-bold px-6 py-2 rounded-2xl transition-all cursor-pointer shadow-sm"
            >
              {isLoading ? "Analysing..." : "Select File"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
            />
          </div>

          {/* ADD ITEM CARD (MIDDLE) */}
          <div className={`col-span-12 md:col-span-4 rounded-3xl p-6 flex flex-col justify-between min-h-[250px] shadow-sm border transition-colors duration-300 ${
            isDarkMode ? "bg-[#14233c] border-[#1e3a5f]" : "bg-[#e8f4fd] border-[#d2e2fc]"
          }`}>
            <h3 className={`text-xl font-bold mb-2 flex items-center gap-1.5 transition-colors duration-300 ${
              isDarkMode ? "text-[#38bdf8]" : "text-[#1a73e8]"
            }`}>
              <Plus size={19} /> Add Item
            </h3>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <input
                type="text"
                placeholder="Item Name"
                value={newEntry.item}
                onChange={(e) => setNewEntry({ ...newEntry, item: e.target.value })}
                className={`w-full rounded-full px-4 py-2.5 text-xl outline-none shadow-inner font-bold border transition-colors duration-300 ${
                  isDarkMode 
                    ? "bg-[#1e293b] border-[#334155] text-white placeholder-[#475569]" 
                    : "bg-white border-[#ccd9e8] text-[#37474f] placeholder-[#b0bec5]"
                }`}
              />
              <input
                type="number"
                step="any"
                placeholder="Amount ($/£)"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                className={`w-full rounded-full px-4 py-2.5 text-xl outline-none shadow-inner font-bold border transition-colors duration-300 ${
                  isDarkMode 
                    ? "bg-[#1e293b] border-[#334155] text-white placeholder-[#475569]" 
                    : "bg-white border-[#ccd9e8] text-[#37474f] placeholder-[#b0bec5]"
                }`}
              />
            </div>
            <button
              onClick={addManualExpense}
              disabled={!newEntry.item || !newEntry.amount}
              className={`w-full text-xl font-bold py-2.5 rounded-full transition-all cursor-pointer shadow-sm mt-3 ${
                isDarkMode
                  ? "bg-[#0284c7] hover:bg-[#0369a1] text-white disabled:opacity-40"
                  : "bg-[#90caf9] hover:bg-[#64b5f6] text-[#1565c0] disabled:opacity-40"
              }`}
            >
              Add
            </button>
          </div>

          {/* SEARCH & FILTER CARD (RIGHT) */}
          <div className={`col-span-12 md:col-span-4 rounded-3xl p-6 flex flex-col justify-between min-h-[250px] shadow-sm border transition-colors duration-300 ${
            isDarkMode ? "bg-[#251e12] border-[#453215]" : "bg-[#fff8e1] border-[#ffe082]/60"
          }`}>
            <h3 className={`text-xl font-bold mb-2 flex items-center gap-1.5 transition-colors duration-300 ${
              isDarkMode ? "text-[#f59e0b]" : "text-[#f57c00]"
            }`}>
              <Search size={19} /> Search
            </h3>
            <div className="flex-1 flex flex-col justify-center mb-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-full px-4 py-2.5 text-xl outline-none shadow-inner font-bold border transition-colors duration-300 ${
                  isDarkMode 
                    ? "bg-[#1e293b] border-[#334155] text-white placeholder-[#475569]" 
                    : "bg-white border-[#ffecb3] text-[#37474f] placeholder-[#b0bec5]"
                }`}
              />
            </div>
            <div className="flex flex-col gap-2 mt-3">
              <button
                onClick={bulkDeleteFiltered}
                disabled={filteredExpenses.length === 0}
                className="w-full bg-[#c1b0fa] hover:bg-[#ad9bfa] disabled:opacity-40 text-white text-xl font-bold py-2.5 rounded-full transition-all cursor-pointer shadow-sm uppercase tracking-wide"
              >
                Delete Filtered ({filteredExpenses.length})
              </button>
              <button
                onClick={() => setSearchTerm('')}
                disabled={!searchTerm}
                className="w-full bg-[#f5f788] hover:bg-[#eaeb6c] disabled:opacity-40 text-[#ffc336] text-xl font-bold py-2.5 rounded-full transition-all cursor-pointer shadow-sm uppercase tracking-wide"
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>

        {/* EXPENSES LISTING CARD */}
        <section className={`rounded-3xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between border transition-colors duration-300 ${
          isDarkMode ? "bg-[#161f30] border-[#223147]" : "bg-white border-[#bbdefb]"
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-4 mb-4 transition-colors duration-300 ${
              isDarkMode ? "border-[#223147]" : "border-[#e8f4fd]"
            }`}>
              <h2 className="text-xl font-bold text-[#3a8ef6]">Expenses</h2>
              {filteredExpenses.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className={`text-xl uppercase font-bold px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                    isDarkMode 
                      ? "bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8]" 
                      : "bg-[#f0f4f8] hover:bg-[#e1eef6] text-[#3a8ef6]"
                  }`}
                >
                  {selectedIds.length === filteredExpenses.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center transition-colors duration-300 ${
                  isDarkMode ? "bg-[#1e293b] text-[#38bdf8]" : "bg-[#e0f1fe] text-[#81d4fa]"
                }`}>
                  <Upload size={32} />
                </div>
                <p className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? "text-[#475569]" : "text-[#81d4fa]"}`}>No items yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`border-b text-xl font-bold uppercase transition-colors duration-300 ${
                      isDarkMode ? "border-[#223147] text-[#64748b]" : "border-[#e1e2e4] text-[#b0bec5]"
                    }`}>
                      <th className="p-3 w-8 text-center"></th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Date</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xl font-bold">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className={`border-b transition-colors duration-200 ${
                        isDarkMode 
                          ? "border-[#1e293b] hover:bg-[#1e293b]/40 text-[#cbd5e1]" 
                          : "border-[#f5f6f7] hover:bg-[#e8f4fd]/40 text-[#37474f]"
                      }`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            className="cursor-pointer accent-[#3a8ef6] w-5 h-5"
                            checked={selectedIds.includes(expense.id)}
                            onChange={() => toggleSelection(expense.id)}
                          />
                        </td>
                        <td className="p-3">{expense.item}</td>
                        <td className={`p-3 text-right ${isDarkMode ? "text-white" : "text-[#37474f]"}`}>${expense.amount.toFixed(2)}</td>
                        <td className={`p-3 text-center font-normal ${isDarkMode ? "text-[#475569]" : "text-[#90a4ae]"}`}>{expense.date}</td>
                        <td className="p-3 text-center w-20">
                          <button
                            onClick={() => removeExpense(expense.id)}
                            className={`p-2 rounded-full transition-all cursor-pointer ${
                              isDarkMode 
                                ? "text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/40" 
                                : "text-[#e57373] hover:text-[#c62828] bg-[#ffebee] hover:bg-[#ffcdd2]"
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className={`border-t pt-4 mt-4 flex justify-end transition-colors duration-300 ${
              isDarkMode ? "border-[#223147]" : "border-[#e8f4fd]"
            }`}>
              <button
                onClick={deleteSelected}
                className={`text-xl font-bold px-4 py-2 rounded-2xl transition-colors flex items-center gap-1 cursor-pointer shadow-sm border ${
                  isDarkMode 
                    ? "bg-red-950/40 hover:bg-red-900/40 text-red-400 border-red-900/30" 
                    : "bg-[#ffebee] hover:bg-[#ffcdd2] text-[#c62828] border-[#ffcdd2]/50"
                }`}
              >
                <Trash2 size={19} /> Delete Selected ({selectedIds.length})
              </button>
            </div>
          )}
        </section>
      </div>

      {/* FOOTER TOTAL RAINBOW GRADIENT CARD */}
      <footer 
        className="max-w-6xl w-full mx-auto rounded-3xl p-6 border border-[#d1c4e9]/30 shadow-md flex items-center justify-between"
        style={{ background: "linear-gradient(90deg, #ffd3bd 0%, #fff5be 25%, #ccf2e8 50%, #cce3fd 75%, #e1d4f9 100%)" }}
      >
        <span className="text-[27px] md:text-[33px] font-extrabold text-[#212121]">
          Total: ${total.toFixed(2)}
        </span>
        <button
          onClick={copyTotal}
          className="bg-white hover:bg-[#f1f3f4] text-[#212121] text-xl font-bold px-5 py-2.5 rounded-2xl transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-[#b0bec5]/15"
        >
          <Copy size={17} /> Copy
        </button>
      </footer>
    </div>
  );
}
