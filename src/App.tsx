import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, 
  Search, 
  Utensils, 
  Clock, 
  Flame, 
  Camera, 
  ArrowRight, 
  RotateCcw,
  Plus,
  X,
  CheckCircle2,
  Timer,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Recipe, ChatMessage } from './types';
import { useDynamicTheme } from './hooks/useDynamicTheme';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const { palette } = useDynamicTheme();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingStep, setCookingStep] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [view, setView] = useState<'home' | 'recipe' | 'cooking' | 'saved' | 'tips'>('home');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('saved_recipes');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState<{ name: string } | null>(() => {
    const savedUser = localStorage.getItem('chef_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [showLogin, setShowLogin] = useState(false);
  const [cookingTips, setCookingTips] = useState<string>('');
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('saved_recipes', JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('chef_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('chef_user');
    }
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addIngredient = () => {
    if (currentInput.trim() && !ingredients.includes(currentInput.trim())) {
      setIngredients([...ingredients, currentInput.trim()]);
      setCurrentInput('');
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const generateRecipes = async () => {
    if (ingredients.length === 0) return;
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `基于以下食材，生成3个创意食谱。食材：${ingredients.join(', ')}。请以JSON格式返回。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING }
                    },
                    required: ["name", "amount"]
                  }
                },
                instructions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                cookingTime: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                nutrition: {
                  type: Type.OBJECT,
                  properties: {
                    calories: { type: Type.STRING },
                    protein: { type: Type.STRING },
                    carbs: { type: Type.STRING },
                    fat: { type: Type.STRING }
                  }
                }
              },
              required: ["id", "title", "description", "ingredients", "instructions", "cookingTime", "difficulty"]
            }
          }
        }
      });

      const data: Recipe[] = JSON.parse(response.text || '[]');
      
      // 为每个食谱生成匹配的 AI 图片
      const recipesWithImages = data.map((recipe) => {
        const genImgKey = import.meta.env.VITE_GEN_IMG_KEY || '';
        const prompt = `Professional food photography of ${recipe.title}, high resolution, appetizing, gourmet style`;
        const imageUrl = `https://api.eachother.work/generate/roddygenimg?key=${genImgKey}&prompts=${encodeURIComponent(prompt)}`;
        return { ...recipe, imageUrl };
      });

      setRecipes(recipesWithImages);
      setView('home');
    } catch (error) {
      console.error("Error generating recipes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe');
  };

  const startCooking = () => {
    setCookingStep(0);
    setView('cooking');
  };

  const toggleSaveRecipe = (recipe: Recipe) => {
    if (savedRecipes.find(r => r.id === recipe.id)) {
      setSavedRecipes(savedRecipes.filter(r => r.id !== recipe.id));
    } else {
      setSavedRecipes([...savedRecipes, recipe]);
    }
  };

  const fetchCookingTips = async () => {
    setView('tips');
    if (cookingTips) return;
    setIsLoadingTips(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "请提供5条实用的家庭烹饪技巧，涵盖食材处理、火候控制和调味建议。请以Markdown格式返回。"
      });
      setCookingTips(response.text || '暂无技巧建议。');
    } catch (error) {
      console.error("Tips error:", error);
    } finally {
      setIsLoadingTips(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ name: '美食爱好者' });
    setShowLogin(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `你是一个专业的烹饪助手。正在协助用户烹饪：${selectedRecipe?.title || '一道菜'}。请提供简洁、专业的烹饪建议。`
        }
      });
      const response = await chat.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || '抱歉，我没听清。' }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: "请识别图片中的所有食材，只返回食材名称，用逗号分隔。例如：番茄, 鸡蛋, 牛肉" }
              ]
            }
          ]
        });

        const text = response.text || '';
        const detected = text.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0);
        const newIngredients = Array.from(new Set([...ingredients, ...detected]));
        setIngredients(newIngredients);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image analysis error:", error);
      alert("图片识别失败，请重试。");
    } finally {
      setIsAnalyzingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSmartMatch = async () => {
    if (ingredients.length === 0) {
      alert("请先添加一些基础食材。");
      return;
    }
    setIsMatching(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `我目前有这些食材：${ingredients.join(', ')}。请推荐3-5种能与这些食材完美搭配的其他食材，只返回食材名称，用逗号分隔。`
      });

      const text = response.text || '';
      const suggestions = text.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0);
      
      // 模拟一个选择弹窗或直接添加
      if (confirm(`AI 建议搭配：${suggestions.join('、')}。是否全部添加？`)) {
        setIngredients(Array.from(new Set([...ingredients, ...suggestions])));
      }
    } catch (error) {
      console.error("Smart match error:", error);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Liquid Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          className="liquid-blob w-96 h-96 top-[-10%] left-[-10%] animate-blob" 
          style={{ backgroundColor: palette.blobs[0] }}
        />
        <div 
          className="liquid-blob w-[500px] h-[500px] bottom-[-20%] right-[-10%] animate-blob [animation-delay:2s]" 
          style={{ backgroundColor: palette.blobs[1] }}
        />
        <div 
          className="liquid-blob w-80 h-80 top-[40%] left-[60%] animate-blob [animation-delay:4s]" 
          style={{ backgroundColor: palette.blobs[2] }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between mx-4 mt-4 rounded-3xl">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => {
            setView('home');
            setSelectedRecipe(null);
            setCookingStep(null);
          }}
        >
          <div className="w-10 h-10 bg-brand-olive rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-olive/20">
            <ChefHat size={24} />
          </div>
          <h1 className="text-2xl font-display font-bold text-brand-olive tracking-tight">ChefAI</h1>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setView('saved')}
            className={cn(
              "text-sm font-medium transition-all px-4 py-2 rounded-full", 
              view === 'saved' ? "glass text-brand-olive" : "text-stone-600 hover:text-brand-olive hover:bg-white/40"
            )}
          >
            我的食谱
          </button>
          <button 
            onClick={fetchCookingTips}
            className={cn(
              "text-sm font-medium transition-all px-4 py-2 rounded-full", 
              view === 'tips' ? "glass text-brand-olive" : "text-stone-600 hover:text-brand-olive hover:bg-white/40"
            )}
          >
            烹饪技巧
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-stone-600">{user.name}</span>
              <button 
                onClick={() => setUser(null)}
                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
              >
                退出
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLogin(true)}
              className="px-4 py-2 bg-brand-olive text-white rounded-full text-sm font-medium hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
            >
              登录
            </button>
          )}
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-10">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <section className="glass rounded-[40px] p-10 text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-olive/30 to-transparent" />
                <h2 className="text-5xl md:text-7xl font-display font-bold text-stone-900 leading-tight">
                  开启您的<span className="text-brand-olive">味蕾之旅</span>
                </h2>
                <p className="text-lg text-stone-500 max-w-2xl mx-auto font-display italic">
                  告诉我们您现有的食材，AI 大厨将为您量身定制独一无二的美味食谱。
                </p>
              </section>

              <section className="glass rounded-[32px] p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                      <input 
                        type="text" 
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                        placeholder="输入食材，如：鸡蛋、番茄、牛肉..."
                        className="w-full pl-12 pr-4 py-4 bg-white/40 backdrop-blur-md border border-white/40 rounded-2xl focus:ring-2 focus:ring-brand-olive/20 transition-all outline-none shadow-inner"
                      />
                    </div>
                    <button 
                      onClick={addIngredient}
                      className="px-6 bg-brand-olive text-white rounded-2xl hover:bg-brand-olive/90 transition-all flex items-center gap-2 font-medium shadow-lg shadow-brand-olive/20"
                    >
                      <Plus size={20} />
                      添加
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 min-h-[48px]">
                    {ingredients.map(ing => (
                      <motion.span
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={ing}
                        className="px-4 py-2 bg-white/40 backdrop-blur-sm border border-brand-olive/10 text-brand-olive rounded-full text-sm flex items-center gap-2 group shadow-sm"
                      >
                        {ing}
                        <button onClick={() => removeIngredient(ing)} className="hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </motion.span>
                    ))}
                    {ingredients.length === 0 && (
                      <p className="text-stone-300 text-sm py-2">尚未添加食材...</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-brand-border/50 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-stone-400 text-sm">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingImage}
                        className="flex items-center gap-1 hover:text-brand-olive transition-colors disabled:opacity-50"
                      >
                        <Camera size={16} /> 
                        {isAnalyzingImage ? "识别中..." : "拍照识别"}
                      </button>
                      <button 
                        onClick={handleSmartMatch}
                        disabled={isMatching || ingredients.length === 0}
                        className="flex items-center gap-1 hover:text-brand-olive transition-colors disabled:opacity-50"
                      >
                        <Utensils size={16} /> 
                        {isMatching ? "匹配中..." : "智能匹配"}
                      </button>
                    </div>
                    <button 
                      onClick={generateRecipes}
                      disabled={ingredients.length === 0 || isGenerating}
                      className={cn(
                        "px-8 py-4 rounded-2xl font-semibold transition-all flex items-center gap-2 shadow-xl",
                        ingredients.length > 0 
                          ? "bg-brand-clay text-white hover:bg-brand-clay/90 shadow-brand-clay/30" 
                          : "bg-brand-border text-brand-muted cursor-not-allowed"
                      )}
                    >
                      {isGenerating ? "正在研发食谱..." : "生成食谱"}
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </section>

              {recipes.length > 0 && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {recipes.map((recipe, idx) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleRecipeSelect(recipe)}
                      className="group cursor-pointer glass rounded-3xl overflow-hidden transition-all duration-500"
                    >
                      <div className="aspect-[4/3] bg-brand-surface relative overflow-hidden">
                        <img 
                          src={recipe.imageUrl || `https://picsum.photos/seed/${recipe.title}/800/600`} 
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-brand-olive shadow-sm">
                          {recipe.difficulty}
                        </div>
                      </div>
                      <div className="p-6 space-y-3">
                        <h3 className="text-xl font-display font-bold text-stone-800">{recipe.title}</h3>
                        <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">{recipe.description}</p>
                        <div className="flex items-center gap-4 pt-2 text-stone-400 text-xs font-medium">
                          <span className="flex items-center gap-1"><Clock size={14} /> {recipe.cookingTime}</span>
                          <span className="flex items-center gap-1"><Flame size={14} /> {recipe.nutrition?.calories || '未知'} kcal</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </section>
              )}
            </motion.div>
          )}

          {view === 'recipe' && selectedRecipe && (
            <motion.div
              key="recipe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              <div className="lg:col-span-2 space-y-8">
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 glass px-4 py-2 rounded-full text-stone-400 hover:text-brand-olive transition-all text-sm font-medium w-fit"
                >
                  <RotateCcw size={16} /> 返回首页
                </button>

                <div className="space-y-4">
                  <h2 className="text-5xl font-display font-bold text-stone-900">{selectedRecipe.title}</h2>
                  <p className="text-xl text-stone-500 font-display italic">{selectedRecipe.description}</p>
                </div>

                <div className="aspect-video rounded-[32px] overflow-hidden bg-brand-surface shadow-inner">
                  <img 
                    src={selectedRecipe.imageUrl || `https://picsum.photos/seed/${selectedRecipe.title}/1200/800`} 
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-display font-bold border-b border-stone-200 pb-2">食材清单</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedRecipe.ingredients.map((ing, i) => (
                <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/40 flex flex-col gap-1">
                  <span className="text-stone-800 font-medium">{ing.name}</span>
                  <span className="text-brand-clay text-sm font-display italic">{ing.amount}</span>
                </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-display font-bold border-b border-stone-200 pb-2">烹饪步骤</h3>
                  <div className="space-y-6">
                    {selectedRecipe.instructions.map((step, i) => (
                      <div key={i} className="flex gap-6 group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full glass flex items-center justify-center text-brand-olive font-display font-bold text-lg">
                          {i + 1}
                        </div>
                        <p className="text-stone-700 leading-relaxed pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="glass text-brand-ink p-8 rounded-[32px] space-y-6">
                  <h3 className="text-xl font-display font-bold border-b border-brand-border/30 pb-4">食谱概览</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-brand-muted text-xs uppercase tracking-wider">难度</span>
                      <p className="font-bold">{selectedRecipe.difficulty}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-brand-muted text-xs uppercase tracking-wider">耗时</span>
                      <p className="font-bold">{selectedRecipe.cookingTime}</p>
                    </div>
                  </div>
                  {selectedRecipe.nutrition && (
                    <div className="pt-4 space-y-4">
                      <span className="text-brand-muted text-xs uppercase tracking-wider">营养成分 (每份)</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                          <p className="text-xs text-brand-muted">热量</p>
                          <p className="font-bold">{selectedRecipe.nutrition.calories}</p>
                        </div>
                        <div className="bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                          <p className="text-xs text-brand-muted">蛋白质</p>
                          <p className="font-bold">{selectedRecipe.nutrition.protein}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={startCooking}
                    className="w-full py-4 bg-white/90 backdrop-blur-sm text-brand-olive rounded-2xl font-bold hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/10"
                  >
                    <Timer size={20} /> 开始烹饪
                  </button>
                  <button 
                    onClick={() => toggleSaveRecipe(selectedRecipe)}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 border backdrop-blur-sm",
                      savedRecipes.find(r => r.id === selectedRecipe.id)
                        ? "bg-brand-primary/10 border-brand-ink/20 text-brand-ink hover:bg-brand-primary/20"
                        : "bg-white/20 border-white/40 text-brand-ink hover:bg-white/30"
                    )}
                  >
                    <CheckCircle2 size={20} className={savedRecipes.find(r => r.id === selectedRecipe.id) ? "fill-brand-ink" : ""} />
                    {savedRecipes.find(r => r.id === selectedRecipe.id) ? "已收藏" : "收藏食谱"}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-stone-100 shadow-sm space-y-4">
                  <h4 className="font-display font-bold text-stone-800">烹饪小贴士</h4>
                  <p className="text-stone-500 text-sm leading-relaxed italic">
                    "在处理番茄时，可以先在底部划十字，开水烫一下即可轻松去皮，口感更细腻。"
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'cooking' && selectedRecipe && cookingStep !== null && (
            <motion.div
              key="cooking"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setView('recipe')}
                    className="glass px-4 py-2 rounded-full text-stone-400 hover:text-brand-olive transition-all text-sm font-medium flex items-center gap-1"
                  >
                    <RotateCcw size={14} /> 退出烹饪模式
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">进度</span>
                    <div className="w-32 h-2 bg-brand-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-olive transition-all duration-500" 
                        style={{ width: `${((cookingStep + 1) / selectedRecipe.instructions.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-brand-olive">{cookingStep + 1}/{selectedRecipe.instructions.length}</span>
                  </div>
                </div>

                <div className="glass rounded-[40px] p-10 space-y-8 min-h-[400px] flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-brand-olive" />
                  <span className="text-brand-olive font-display font-bold text-6xl opacity-10 absolute top-8 left-10">Step {cookingStep + 1}</span>
                  
                  <motion.div
                    key={cookingStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6 relative z-10"
                  >
                    <h3 className="text-3xl md:text-4xl font-display font-medium text-stone-800 leading-snug">
                      {selectedRecipe.instructions[cookingStep]}
                    </h3>
                  </motion.div>

                  <div className="flex gap-4 pt-8">
                    <button 
                      onClick={() => setCookingStep(Math.max(0, cookingStep - 1))}
                      disabled={cookingStep === 0}
                      className="flex-1 py-4 bg-brand-surface text-brand-primary rounded-2xl font-bold hover:bg-brand-border transition-all disabled:opacity-50"
                    >
                      上一步
                    </button>
                    {cookingStep < selectedRecipe.instructions.length - 1 ? (
                      <button 
                        onClick={() => setCookingStep(cookingStep + 1)}
                        className="flex-[2] py-4 bg-brand-olive text-white rounded-2xl font-bold hover:bg-brand-olive/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-olive/20"
                      >
                        下一步 <ChevronRight size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setView('home');
                          alert('恭喜！你已完成烹饪。');
                        }}
                        className="flex-[2] py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                      >
                        完成烹饪 <CheckCircle2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Chat Assistant Side Panel */}
              <div className="glass rounded-[32px] flex flex-col h-[600px] lg:h-auto overflow-hidden">
                <div className="p-6 border-b border-white/20 flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-clay rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-clay/20">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-stone-800">AI 助手</h4>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest">实时答疑</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <ChefHat size={32} className="text-brand-olive/30 drop-shadow-[0_0_8px_rgba(236,72,153,0.2)]" />
                      <p className="text-stone-400 text-sm italic">有问题随时问我，比如“火候怎么控制？”</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-brand-olive/80 backdrop-blur-sm text-white rounded-tr-none shadow-sm" 
                          : "bg-white/40 backdrop-blur-sm text-stone-700 rounded-tl-none border border-white/40 shadow-sm"
                      )}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex gap-1 p-2">
                      <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-stone-100">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="咨询烹饪细节..."
                      className="w-full pl-4 pr-10 py-3 bg-white/40 backdrop-blur-md border border-white/40 rounded-xl text-sm outline-none focus:ring-1 focus:ring-brand-olive/20 transition-all shadow-inner"
                    />
                    <button 
                      onClick={sendChatMessage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-olive hover:scale-110 transition-transform"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'saved' && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-display font-bold text-stone-900">我的收藏食谱</h2>
                <button 
                  onClick={() => setView('home')}
                  className="glass px-4 py-2 rounded-full text-stone-400 hover:text-brand-olive transition-all text-sm font-medium"
                >
                  返回首页
                </button>
              </div>

              {savedRecipes.length === 0 ? (
                <div className="glass rounded-[32px] p-20 text-center space-y-4">
                  <Utensils size={48} className="mx-auto text-brand-olive/40 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]" />
                  <p className="text-stone-400 font-display italic text-lg">您还没有收藏任何食谱，快去探索美味吧！</p>
                  <button 
                    onClick={() => setView('home')}
                    className="px-6 py-3 bg-brand-olive text-white rounded-full font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20"
                  >
                    去发现
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {savedRecipes.map((recipe, idx) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleRecipeSelect(recipe)}
                      className="group cursor-pointer glass rounded-3xl overflow-hidden transition-all duration-500"
                    >
                      <div className="aspect-[4/3] bg-brand-surface relative overflow-hidden">
                        <img 
                          src={recipe.imageUrl || `https://picsum.photos/seed/${recipe.title}/800/600`} 
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-6 space-y-3">
                        <h3 className="text-xl font-display font-bold text-stone-800">{recipe.title}</h3>
                        <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">{recipe.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'tips' && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-display font-bold text-stone-900">烹饪技巧大赏</h2>
                <button 
                  onClick={() => setView('home')}
                  className="glass px-4 py-2 rounded-full text-stone-400 hover:text-brand-olive transition-all text-sm font-medium"
                >
                  返回首页
                </button>
              </div>

              <div className="glass rounded-[40px] p-10">
                {isLoadingTips ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-olive/10 border-t-brand-olive rounded-full animate-spin shadow-[0_0_15px_rgba(236,72,153,0.2)]" />
                    <p className="text-stone-400 font-display italic">正在为您整理大厨秘籍...</p>
                  </div>
                ) : (
                  <div className="markdown-body">
                    <ReactMarkdown>{cookingTips}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="glass text-brand-muted py-12 px-6 mt-12 mx-4 mb-4 rounded-[40px]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand-ink">
              <ChefHat size={24} />
              <span className="text-xl font-display font-bold">ChefAI</span>
            </div>
            <p className="text-sm leading-relaxed">
              利用先进的AI技术，为您打造极致的烹饪体验。从食材到餐桌，我们全程相伴。
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-brand-ink font-display font-bold">快速链接</h4>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="hover:text-brand-ink transition-colors">关于我们</a></li>
              <li><a href="#" className="hover:text-brand-ink transition-colors">隐私政策</a></li>
              <li><a href="#" className="hover:text-brand-ink transition-colors">联系支持</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-xs">
          © 2026 ChefAI - 智能烹饪助手. 保留所有权利.
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass rounded-[32px] p-8 shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand-olive rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-brand-olive/20">
                  <ChefHat size={32} />
                </div>
                <h3 className="text-2xl font-display font-bold text-stone-800">欢迎回来</h3>
                <p className="text-stone-400 text-sm">登录以同步您的收藏食谱和偏好</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">邮箱</label>
                  <input type="email" required placeholder="your@email.com" className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/40 rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">密码</label>
                  <input type="password" required placeholder="••••••••" className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-white/40 rounded-xl outline-none focus:ring-2 focus:ring-brand-olive/20 transition-all shadow-inner" />
                </div>
                <button type="submit" className="w-full py-4 bg-brand-olive text-white rounded-2xl font-bold hover:bg-brand-olive/90 transition-all shadow-lg shadow-brand-olive/20">
                  立即登录
                </button>
              </form>

              <div className="text-center">
                <button className="text-sm text-stone-400 hover:text-brand-olive transition-colors">还没有账号？立即注册</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
