"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Headphones,
  Search,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  ChevronRight,
  Copy,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ChatMessage {
  sender: "bot" | "user"
  text: string
  time: string
}

interface SubmittedTicket {
  id: string
  name: string
  email: string
  category: string
  priority: string
  subject: string
  timestamp: string
}

export default function CustomerCarePage() {
  const { data: session, status } = useSession()
  const { language, t } = useLanguage()
  const isHindi = language === "hi"

  // FAQ Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Live Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: isHindi
        ? "नमस्ते! मैं MedUnbox केयर असिस्टेंट हूँ। मैं आपकी मेडिकल वॉल्ट, रिपोर्ट अपलोड, डॉक्टर शेयरिंग या सेटिंग्स में कैसे सहायता कर सकता हूँ?"
        : "Hello! Welcome to MedUnbox Customer Care. How can I assist you with your medical vault, document uploads, doctor sharing, or settings today?",
      time: "Just now",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  // Ticket Form state
  const [ticketForm, setTicketForm] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    phone: "",
    category: "general",
    priority: "normal",
    subject: "",
    message: "",
  })
  const [submittingTicket, setSubmittingTicket] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState<SubmittedTicket | null>(null)

  // FAQs Data
  const faqs = [
    {
      q: isHindi
        ? "मैं अपनी लैब रिपोर्ट या प्रिस्क्रिप्शन कैसे अपलोड करूँ?"
        : "How do I upload my lab reports or prescriptions?",
      a: isHindi
        ? "डैशबोर्ड या दस्तावेज़ (Documents) पेज पर जाएं और 'Upload' बटन पर क्लिक करें। आप PDF, JPG, PNG या कैमरे से खींची गई तस्वीरें सीधे अपलोड कर सकते हैं। MedUnbox का AI तुरंत आवश्यक टेस्ट और मानों को निकाल लेगा।"
        : "Navigate to the Documents page or Dashboard and click 'Upload Document'. You can upload PDFs, JPGs, or camera photos of your reports. MedUnbox's evidence-first AI will automatically extract tests, dates, and biomarker values.",
      category: "vault",
    },
    {
      q: isHindi
        ? "क्या मेरा मेडिकल डेटा और आधार नंबर सुरक्षित है?"
        : "Is my medical data and Aadhaar number secure?",
      a: isHindi
        ? "हाँ, आपका डेटा पूरी तरह से निजी और एन्क्रिप्टेड है। MedUnbox भारत के DPDP अधिनियम 2023 और ABDM मानकों का पालन करता है। कोई भी डॉक्टर आपकी स्पष्ट सहमति और ओटीपी के बिना आपका डेटा नहीं देख सकता।"
        : "Absolutely. All documents are stored in private encrypted storage with 256-bit encryption. MedUnbox strictly complies with India's DPDP Act 2023 and ABDM standards. Access is granted solely with your explicit permission and OTP verification.",
      category: "privacy",
    },
    {
      q: isHindi
        ? "मैं भाषा को हिन्दी या अंग्रेज़ी में कैसे बदल सकता हूँ?"
        : "How do I change the language between Hindi and English?",
      a: isHindi
        ? "आप ऊपरी हेडर में दिए गए भाषा टॉगल (EN / हि) पर क्लिक कर सकते हैं, या 'Settings' पेज पर जाकर 'Language & Localization' अनुभाग में हिन्दी या अंग्रेज़ी चुन सकते हैं। यह तुरंत पूरे ऐप और आपके सारांश को स्थानीयकृत कर देगा।"
        : "You can click the Language toggle (EN / हि) in the top header, or go to the 'Settings' page under 'Language & Localization' to select Hindi or English. Your choice persists across sessions and adapts your summaries.",
      category: "settings",
    },
    {
      q: isHindi
        ? "मैं डॉक्टर के साथ अपनी रिपोर्ट कैसे शेयर करूँ?"
        : "How do I share my records with a doctor?",
      a: isHindi
        ? "साझाकरण (Sharing) टैब में जाएं, डॉक्टर का ईमेल या नाम दर्ज करें, और वह समयावधि चुनें (जैसे 1 घंटा, 24 घंटे या 7 दिन) जिसके लिए आप एक्सेस देना चाहते हैं। आप केवल विशिष्ट श्रेणियां जैसे 'Lab Reports' भी चुन सकते हैं और कभी भी एक्सेस वापस ले सकते हैं।"
        : "Visit the Sharing tab, specify the doctor's email or registered name, and choose the access duration (e.g. 1 hour, 24 hours, 7 days, or until revoked). You can scope access to specific categories (e.g., Lab Reports only) and revoke it at any second.",
      category: "sharing",
    },
    {
      q: isHindi
        ? "आपातकालीन (Emergency) एक्सेस कैसे काम करता है?"
        : "How does emergency QR code access work?",
      a: isHindi
        ? "Emergency पेज पर आपका एक अनूठा आपातकालीन QR कोड और 6-अंकीय आपातकालीन पिन होता है। आपातकाल में डॉक्टर या पैरामेडिक इसे स्कैन करके आपकी एलर्जी, रक्त समूह और आपातकालीन संपर्क देख सकते हैं।"
        : "Your Emergency page generates a secure QR code and 6-digit emergency PIN. First responders can scan this to view critical life-saving info like blood group, allergies, and emergency contacts without accessing your full vault.",
      category: "emergency",
    },
    {
      q: isHindi
        ? "यदि AI द्वारा निकाला गया कोई मान गलत दिखे तो क्या करें?"
        : "What if an extracted lab value looks incorrect?",
      a: isHindi
        ? "MedUnbox में प्रत्येक निकाले गए मान के साथ मूल दस्तावेज़ का साक्ष्य (Provenance) जुड़ा होता है। आप दस्तावेज़ व्यूअर में जाकर मूल रिपोर्ट से तुलना कर सकते हैं या दस्तावेज़ को पुनः प्रोसेस करने का अनुरोध कर सकते हैं।"
        : "Every single extracted value cites the exact page and source text from your uploaded document. You can open the original document viewer to cross-check, or report a discrepancy through our Customer Care ticket system.",
      category: "vault",
    },
  ]

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Smart bot automated responses
  const botAnswers: Record<string, string> = {
    upload: isHindi
      ? "रिपोर्ट अपलोड करने के लिए: 1. बाईं ओर 'दस्तावेज़' (Documents) पर क्लिक करें। 2. 'Upload' दबाएँ। 3. अपनी फाइल चुनें। हमारा AI 5 सेकंड में डेटा निकाल लेगा।"
      : "To upload a report: 1. Click 'Documents' in the sidebar. 2. Click 'Upload Document'. 3. Select your PDF or photo. Our evidence-first AI extracts all lab values in seconds.",
    share: isHindi
      ? "डॉक्टर शेयरिंग: 'Sharing' मेनू में जाएं > 'Share with Doctor' चुनें > डॉक्टर का ईमेल और समय (उदा. 24 घंटे) चुनें। आप जब चाहें शेयर रद्द कर सकते हैं।"
      : "Doctor Sharing: Navigate to 'Sharing' > click 'Share with Doctor' > select duration (1 hour to 30 days) and document categories. You can revoke access at any time.",
    language: isHindi
      ? "भाषा बदलने के लिए: ऊपर दाएँ कोने में 'हि / EN' बटन दबाएँ या 'Settings' पेज पर जाकर हिन्दी या English चुनें।"
      : "To change language: Use the 'EN / हि' toggle in the top header or visit 'Settings' > 'Language & Localization' to select English or Hindi.",
    hindi: isHindi
      ? "हिन्दी भाषा सक्रिय है। आप सेटिंग्स या ऊपर हेडर से कभी भी भाषा बदल सकते हैं।"
      : "Hindi language is available! Switch via the header toggle or through your Settings menu.",
    privacy: isHindi
      ? "आपकी गोपनीयता 100% सुरक्षित है। हम 256-बिट एन्क्रिप्शन का उपयोग करते हैं और आपकी अनुमति के बिना कोई भी डेटा नहीं देख सकता।"
      : "Your privacy is guaranteed. All records use 256-bit vault encryption and cannot be accessed by any third party without your consent.",
    aadhaar: isHindi
      ? "आधार डेटा केवल सत्यापन के लिए उपयोग किया जाता है। आपका आधार नंबर एन्क्रिप्टेड रहता है और कभी सार्वजनिक नहीं होता।"
      : "Aadhaar info is used solely for identity verification in compliance with ABDM guidelines. Numbers are encrypted and never exposed.",
    emergency: isHindi
      ? "आपातकालीन कार्ड: 'Emergency' पेज पर जाएं। वहां आपको अपना क्यूआर कोड और आपातकालीन संपर्क दिखेंगे।"
      : "Emergency Access: Head to the 'Emergency' section in your sidebar to view your emergency QR code, blood group, and emergency contacts.",
  }

  function handleSendChat(textToSend?: string) {
    const text = textToSend ?? chatInput
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setChatMessages((prev) => [...prev, userMsg])
    if (!textToSend) setChatInput("")
    setIsTyping(true)

    // Simulate smart reply
    setTimeout(() => {
      const lower = text.toLowerCase()
      let reply = isHindi
        ? "धन्यवाद! आपका प्रश्न दर्ज कर लिया गया है। क्या आप चाहते हैं कि मैं हमारे सहायता एजेंट के लिए टिकट बना दूं?"
        : "Thank you for reaching out! I understand your question. If you need dedicated human support, you can also raise a support ticket below."

      for (const [key, answer] of Object.entries(botAnswers)) {
        if (lower.includes(key)) {
          reply = answer
          break
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
      setIsTyping(false)
    }, 1200)
  }

  function handleTicketSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) {
      toast.error(isHindi ? "कृपया विषय और विवरण भरें" : "Please provide a subject and message")
      return
    }

    setSubmittingTicket(true)
    setTimeout(() => {
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const ticket: SubmittedTicket = {
        id: `MUB-${randomNum}`,
        name: ticketForm.name || "Valued User",
        email: ticketForm.email || "support-request@user.local",
        category: ticketForm.category,
        priority: ticketForm.priority,
        subject: ticketForm.subject,
        timestamp: new Date().toLocaleString(),
      }
      setSubmittedTicket(ticket)
      setSubmittingTicket(false)
      toast.success(
        isHindi
          ? `टिकट दर्ज किया गया (#${ticket.id})`
          : `Support ticket created successfully (#${ticket.id})`
      )
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">MedUnbox</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.home")}
            </Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("landing.about")}
            </Link>
            <Link href="/customer-care" className="text-primary font-semibold transition-colors">
              {t("landing.customerCare")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {status === "authenticated" ? (
              <Button asChild className="rounded-xl shadow-sm">
                <Link
                  href={
                    session?.user?.role === "DOCTOR"
                      ? "/doctor"
                      : session?.user?.role === "PHARMACIST"
                      ? "/pharmacist"
                      : session?.user?.role === "LAB_TECHNICIAN"
                      ? "/lab-technician"
                      : "/dashboard"
                  }
                >
                  {t("landing.goToDashboard")} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild className="rounded-xl">
                <Link href="/login">{t("landing.signIn")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b py-14 md:py-20 bg-muted/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5 -z-10" />
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-4">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 rounded-full text-xs">
            <Headphones className="h-3.5 w-3.5 text-primary" />
            {isHindi ? "24/7 समर्पित ग्राहक सहायता" : "24/7 Dedicated Care & Assistance"}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            {t("care.title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            {t("care.subtitle")}
          </p>

          {/* Quick Search */}
          <div className="pt-4 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("care.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-primary/20 bg-card/90 shadow-sm text-sm"
            />
          </div>
        </div>
      </section>

      {/* Main Tabs Area */}
      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-12">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger value="chat" className="rounded-xl py-2.5 gap-2 text-xs sm:text-sm font-medium">
              <Bot className="h-4 w-4 text-primary" />
              {t("care.liveChat")}
            </TabsTrigger>
            <TabsTrigger value="ticket" className="rounded-xl py-2.5 gap-2 text-xs sm:text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t("care.raiseTicket")}
            </TabsTrigger>
            <TabsTrigger value="helpline" className="rounded-xl py-2.5 gap-2 text-xs sm:text-sm font-medium">
              <Phone className="h-4 w-4 text-primary" />
              {t("care.helpline")}
            </TabsTrigger>
            <TabsTrigger value="faqs" className="rounded-xl py-2.5 gap-2 text-xs sm:text-sm font-medium">
              <HelpCircle className="h-4 w-4 text-primary" />
              {t("care.faqs")}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Live Chat Simulator */}
          <TabsContent value="chat">
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Bot className="h-5 w-5" />
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        MedUnbox Care Assistant
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                          Online
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isHindi
                          ? "तत्काल AI और ग्राहक सेवा प्रतिक्रिया"
                          : "Instant automated health vault assistance"}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground font-mono hidden sm:block">
                    Avg reply: &lt; 2s
                  </div>
                </div>
              </CardHeader>

              {/* Chat Thread */}
              <CardContent className="p-4 space-y-4">
                <div className="h-[380px] overflow-y-auto space-y-3.5 pr-2">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2.5 max-w-[85%]",
                        msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {msg.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs",
                            msg.sender === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-xs"
                              : "bg-muted/70 text-foreground border rounded-tl-xs"
                          )}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-muted-foreground block mt-1 px-1">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-2.5 items-center text-xs text-muted-foreground italic">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex gap-1 py-2 px-3 rounded-2xl bg-muted/60 border">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="pt-2 border-t">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">
                    {isHindi ? "त्वरित प्रश्न चुनें:" : "Suggested topics:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        key: "upload",
                        label: isHindi ? "📄 रिपोर्ट कैसे अपलोड करें?" : "📄 How to upload report?",
                      },
                      {
                        key: "share",
                        label: isHindi ? "👨‍⚕️ डॉक्टर शेयरिंग कैसे करें?" : "👨‍⚕️ How does doctor share work?",
                      },
                      {
                        key: "language",
                        label: isHindi ? "🌐 भाषा कैसे बदलें?" : "🌐 How to change language?",
                      },
                      {
                        key: "emergency",
                        label: isHindi ? "🚨 आपातकालीन QR कोड?" : "🚨 Emergency QR code?",
                      },
                      {
                        key: "privacy",
                        label: isHindi ? "🔒 क्या मेरा डेटा निजी है?" : "🔒 Is my data private?",
                      },
                    ].map((pill) => (
                      <button
                        key={pill.key}
                        onClick={() => handleSendChat(pill.label)}
                        className="text-xs bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border rounded-lg px-2.5 py-1.5 transition-all text-left"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input Bar */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder={
                      isHindi
                        ? "अपना प्रश्न यहाँ लिखें..."
                        : "Type your question or issue here..."
                    }
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChat()
                    }}
                    className="rounded-xl h-11 text-sm"
                  />
                  <Button
                    onClick={() => handleSendChat()}
                    disabled={!chatInput.trim() || isTyping}
                    className="h-11 px-4 rounded-xl gap-1.5"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {isHindi ? "भेजें" : "Send"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Support Ticket Submission */}
          <TabsContent value="ticket">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {isHindi ? "नया सहायता टिकट दर्ज करें" : "Submit a Support Ticket"}
                </CardTitle>
                <CardDescription>
                  {isHindi
                    ? "हमारे तकनीकी एवं मेडिकल रिकॉर्ड विशेषज्ञ 2 घंटे के भीतर आपकी समस्या का समाधान करेंगे।"
                    : "Our patient care informatics desk responds to every verified inquiry within 2 business hours."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {submittedTicket ? (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">
                          {isHindi ? "टिकट सफलतापूर्वक दर्ज हो गया!" : "Support Ticket Created!"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {isHindi
                            ? "एक पुष्टिकरण ईमेल आपकी आईडी पर भेज दिया गया है।"
                            : "A confirmation receipt has been sent to your registered email."}
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-xl bg-background/80 border">
                        <span className="text-muted-foreground">Ticket ID:</span>
                        <div className="flex items-center justify-between font-mono font-bold text-sm text-primary mt-0.5">
                          <span>#{submittedTicket.id}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(submittedTicket.id)
                              toast.success("Ticket ID copied")
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-background/80 border">
                        <span className="text-muted-foreground">Status:</span>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Assigned to Tier-1 Specialist
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-background/80 border">
                        <span className="text-muted-foreground">Subject:</span>
                        <p className="font-medium truncate mt-0.5">{submittedTicket.subject}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-background/80 border">
                        <span className="text-muted-foreground">Expected Resolution:</span>
                        <p className="font-medium text-primary mt-0.5">Under 2 hours</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-xl text-xs"
                      onClick={() => setSubmittedTicket(null)}
                    >
                      {isHindi ? "एक और टिकट दर्ज करें" : "Raise Another Ticket"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tname">{isHindi ? "आपका नाम" : "Your Full Name"}</Label>
                        <Input
                          id="tname"
                          value={ticketForm.name}
                          onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                          placeholder="Dr. / Mr. / Ms."
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temail">{isHindi ? "ईमेल पता" : "Email Address"}</Label>
                        <Input
                          id="temail"
                          type="email"
                          value={ticketForm.email}
                          onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                          placeholder="you@domain.com"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="category">{isHindi ? "समस्या श्रेणी" : "Issue Category"}</Label>
                        <Select
                          value={ticketForm.category}
                          onValueChange={(v) => setTicketForm({ ...ticketForm, category: v })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Inquiry</SelectItem>
                            <SelectItem value="upload">Document Upload & Extraction</SelectItem>
                            <SelectItem value="doctor-share">Doctor Sharing & Consent</SelectItem>
                            <SelectItem value="language">Language & Translation</SelectItem>
                            <SelectItem value="emergency">Emergency QR & Contacts</SelectItem>
                            <SelectItem value="bug">Technical Bug / Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">{isHindi ? "प्राथमिकता" : "Priority Level"}</Label>
                        <Select
                          value={ticketForm.priority}
                          onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (General question)</SelectItem>
                            <SelectItem value="normal">Normal (Standard help)</SelectItem>
                            <SelectItem value="high">High (Report extraction issue)</SelectItem>
                            <SelectItem value="urgent">Urgent (Emergency access issue)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tsubject">{isHindi ? "विषय" : "Subject"}</Label>
                      <Input
                        id="tsubject"
                        placeholder={isHindi ? "समस्या का संक्षिप्त सारांश" : "Brief summary of your inquiry"}
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tmsg">{isHindi ? "विस्तृत विवरण" : "Detailed Message"}</Label>
                      <Textarea
                        id="tmsg"
                        rows={4}
                        placeholder={
                          isHindi
                            ? "कृपया अपनी समस्या, संबंधित रिपोर्ट का नाम या कोई त्रुटि संदेश यहाँ बताएं..."
                            : "Provide any specific report names, doctor IDs, or details to help us resolve faster..."
                        }
                        value={ticketForm.message}
                        onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingTicket}
                      className="rounded-xl shadow-sm gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {submittingTicket
                        ? isHindi
                          ? "दर्ज किया जा रहा है..."
                          : "Submitting ticket..."
                        : isHindi
                        ? "टिकट दर्ज करें"
                        : "Submit Support Ticket"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Helplines & Contact Channels */}
          <TabsContent value="helpline">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Toll-Free National Line */}
              <Card className="rounded-2xl border-primary/20 hover:border-primary/50 transition-all p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {isHindi ? "24x7 राष्ट्रीय टोल-फ्री हेल्पलाइन" : "24/7 National Toll-Free Helpline"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Free from any mobile or landline across India
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border">
                  <span className="text-2xl font-mono font-extrabold tracking-wider text-primary">
                    1800-200-UNBOX
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Direct dial: <span className="font-mono">1800-200-8626</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dedicated customer service representatives are available in English, Hindi, and regional languages.
                </p>
              </Card>

              {/* Emergency Medical Response */}
              <Card className="rounded-2xl border-red-500/20 hover:border-red-500/50 transition-all p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {isHindi ? "आपातकालीन चिकित्सा सहायता" : "Emergency Medical Helpline"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      For acute trauma, ambulance dispatch & critical emergencies
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <span className="text-2xl font-mono font-extrabold tracking-wider text-red-600 dark:text-red-400">
                    112 / +91 11 2345 6789
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Immediate first-responder medical coordination
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  In severe medical crisis, always call 112 immediately or proceed to the nearest hospital casualty ward.
                </p>
              </Card>

              {/* WhatsApp Quick Care */}
              <Card className="rounded-2xl border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {isHindi ? "व्हाट्सएप त्वरित सहायता" : "WhatsApp Quick Assistant"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Instant report status and sharing notifications
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border">
                  <span className="text-xl font-mono font-bold text-emerald-600">
                    +91 98765 43210
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send "HI" to initiate instant bot assistant on WhatsApp
                  </p>
                </div>
              </Card>

              {/* Email Support */}
              <Card className="rounded-2xl border p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {isHindi ? "ईमेल सहायता डेस्क" : "Official Support Email"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      For corporate inquiries, doctor onboarding & verification
                    </p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-card border">
                  <span className="text-lg font-mono font-bold text-foreground">
                    care@medunbox.health
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average response time: within 2 hours
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: Categorized FAQs */}
          <TabsContent value="faqs">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {t("care.faqs")}
                </CardTitle>
                <CardDescription>
                  {isHindi
                    ? "मरीजों एवं डॉक्टरों द्वारा सबसे अधिक पूछे जाने वाले प्रश्नों के उत्तर"
                    : "Instant answers to the most common questions about the vault, privacy, and doctor access"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-sm font-medium">No articles matched your search.</p>
                    <p className="text-xs text-muted-foreground">
                      Try asking our AI Care Assistant in the Live Chat tab.
                    </p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFaqs.map((faq, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger className="text-left font-medium text-sm py-4">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* System Health Status Banner */}
        <div className="rounded-2xl border p-5 bg-card/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isHindi ? "सभी MedUnbox सिस्टम सामान्य रूप से कार्यरत हैं" : "All MedUnbox Systems Operational"}
              </p>
              <p className="text-xs text-muted-foreground">
                Vault Storage (99.99%) • Evidence Extraction Engine • Scoped Doctor Portal
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Uptime 99.98%
          </Badge>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background mt-auto py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-semibold">MedUnbox</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                {t("landing.home")}
              </Link>
              <Link href="/about" className="hover:text-foreground">
                {t("landing.about")}
              </Link>
              <Link href="/customer-care" className="hover:text-foreground font-medium text-foreground">
                {t("landing.customerCare")}
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                {t("nav.settings")}
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            MedUnbox 24/7 Care Desk. Dedicated to patient sovereignty, confidentiality, and evidence integrity.
          </p>
        </div>
      </footer>
    </div>
  )
}
