"use client"

import React, { createContext, useContext, useEffect, useState, useTransition } from "react"
import { useSession } from "next-auth/react"

export type Language = "en" | "hi"

export interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, fallback?: string) => string
}

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.summary": "Health Summary",
    "nav.goals": "Goals",
    "nav.documents": "Documents",
    "nav.timeline": "Timeline",
    "nav.vitals": "Vitals",
    "nav.medications": "Medications",
    "nav.allergies": "Allergies",
    "nav.immunizations": "Immunizations",
    "nav.trends": "Trends",
    "nav.labReference": "Lab Reference",
    "nav.conflicts": "Conflicts",
    "nav.careTeam": "Care Team",
    "nav.sharing": "Sharing",
    "nav.emergency": "Emergency",
    "nav.settings": "Settings",
    "nav.customerCare": "Customer Care",
    "nav.about": "About Us",
    "nav.patients": "Patients",
    "nav.askRecords": "Ask My Records",
    "nav.signOut": "Sign out",
    "nav.menu": "Menu",
    "nav.access": "Access",
    "nav.portal.patient": "Patient Vault",
    "nav.portal.doctor": "Doctor Portal",
    "nav.portal.pharmacist": "Pharmacist Portal",
    "nav.portal.lab": "Lab Portal",

    // Header & Actions
    "header.searchPlaceholder": "Search records, tests, medications...",
    "header.help": "Customer Care & Help",
    "header.themeToggle": "Toggle theme",
    "header.language": "Language",

    // Landing / Navbar
    "landing.home": "Home",
    "landing.about": "About",
    "landing.customerCare": "Customer Care",
    "landing.features": "Features",
    "landing.howItWorks": "How It Works",
    "landing.signIn": "Sign in",
    "landing.getStarted": "Get started",
    "landing.goToDashboard": "Go to Dashboard",
    "landing.heroBadge": "Patient-controlled • Evidence-first AI",
    "landing.heroTitle": "Your complete medical history, in one private vault",
    "landing.heroDesc": "Upload reports, prescriptions, and scans. MedUnbox extracts structured data, builds a longitudinal timeline, detects trends and conflicts, and lets your doctors ask questions grounded in your actual records.",
    "landing.createVault": "Create your medical vault",
    "landing.existingAccount": "I already have an account",

    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your profile, language preferences, and account configuration",
    "settings.account": "Account",
    "settings.accountDesc": "Your primary account identification",
    "settings.fullName": "Full Name",
    "settings.email": "Email Address",
    "settings.emailNotice": "Email address cannot be changed",
    "settings.language": "Language & Localization",
    "settings.languageDesc": "Choose your preferred language. Patient-facing summaries and UI will adapt immediately.",
    "settings.languageHelp": "English is standard for clinical and lab references. Hindi simplifies summaries and navigation for patients.",
    "settings.langEn": "English",
    "settings.langEnDesc": "International clinical standard. Full medical terminology.",
    "settings.langHi": "हिन्दी (Hindi)",
    "settings.langHiDesc": "भारतीय भाषाओं में सहज समझ। रोगी सारांश और आसान नेविगेशन।",
    "settings.medicalProfile": "Medical Profile",
    "settings.medicalProfileDesc": "Optional demographic and emergency info for healthcare providers",
    "settings.dob": "Date of Birth",
    "settings.gender": "Gender",
    "settings.genderSelect": "Select gender",
    "settings.genderMale": "Male",
    "settings.genderFemale": "Female",
    "settings.genderOther": "Other",
    "settings.notSpecified": "Not specified",
    "settings.bloodGroup": "Blood Group",
    "settings.unknown": "Unknown",
    "settings.phone": "Phone Number",
    "settings.address": "Address / City",
    "settings.emergencyContact": "Emergency Contact (Name & Phone)",
    "settings.profDetails": "Professional Details",
    "settings.profDetailsDesc": "Your verified medical registration and practice details",
    "settings.regNo": "Registration Number (MCI / State Council)",
    "settings.specialization": "Specialization",
    "settings.hospital": "Hospital / Clinic Name",
    "settings.saveChanges": "Save Changes",
    "settings.saving": "Saving changes...",
    "settings.saved": "Settings saved successfully",
    "settings.errorSave": "Failed to save settings. Please try again.",
    "settings.dangerZone": "Danger Zone",
    "settings.dangerDesc": "Irreversible and destructive account actions",
    "settings.deleteAccount": "Delete Account",
    "settings.deleteDesc": "Permanently purge your account and all associated medical records from the vault.",

    // About Page
    "about.title": "About MedUnbox",
    "about.subtitle": "Empowering patients with total ownership of their lifelong medical records through evidence-first AI.",
    "about.missionTitle": "Our Mission",
    "about.missionDesc": "Healthcare records in India and worldwide remain severely fragmented across physical papers, PDFs, hospital portals, and diagnostic apps. MedUnbox unifies every test, scan, and prescription into a secure, patient-owned longitudinal record.",
    "about.pillar1Title": "Patient Sovereignty",
    "about.pillar1Desc": "You own your data. Only you decide which doctor, hospital, or family member can view your records, for exactly how long.",
    "about.pillar2Title": "Zero-Hallucination AI",
    "about.pillar2Desc": "Every summary and trend references the exact document page, line, and timestamp. No fabricated medical claims.",
    "about.pillar3Title": "Longitudinal Continuity",
    "about.pillar3Desc": "Track your vitals, biomarkers, and prescriptions across years and multiple healthcare providers seamlessly.",
    "about.pillar4Title": "Open Interoperability",
    "about.pillar4Desc": "Built to align with India's Ayushman Bharat Digital Mission (ABDM) and DPDP Act 2023 for trusted compliance.",

    // Customer Care
    "care.title": "Customer Care & Support",
    "care.subtitle": "We are here to assist you 24/7. Get quick answers, chat with our care team, or submit an inquiry.",
    "care.searchPlaceholder": "Search help articles, guides, or error codes...",
    "care.liveChat": "Live Support Chat",
    "care.raiseTicket": "Raise a Support Ticket",
    "care.helpline": "24/7 Helplines",
    "care.faqs": "Frequently Asked Questions",
    "care.systemStatus": "System Status",
  },
  hi: {
    // Navigation
    "nav.dashboard": "डैशबोर्ड",
    "nav.summary": "स्वास्थ्य सारांश",
    "nav.goals": "लक्ष्य",
    "nav.documents": "दस्तावेज़",
    "nav.timeline": "समयरेखा",
    "nav.vitals": "वाइटल्स",
    "nav.medications": "दवाएं",
    "nav.allergies": "एलर्जी",
    "nav.immunizations": "टीकाकरण",
    "nav.trends": "रुझान",
    "nav.labReference": "लैब संदर्भ",
    "nav.conflicts": "विरोधाभास",
    "nav.careTeam": "देखभाल टीम",
    "nav.sharing": "साझाकरण",
    "nav.emergency": "आपातकालीन",
    "nav.settings": "सेटिंग्स",
    "nav.customerCare": "ग्राहक सेवा",
    "nav.about": "हमारे बारे में",
    "nav.patients": "मरीज़",
    "nav.askRecords": "रिकॉर्ड से पूछें",
    "nav.signOut": "साइन आउट",
    "nav.menu": "मेनू",
    "nav.access": "एक्सेस",
    "nav.portal.patient": "मरीज़ वॉल्ट",
    "nav.portal.doctor": "डॉक्टर पोर्टल",
    "nav.portal.pharmacist": "फार्मासिस्ट पोर्टल",
    "nav.portal.lab": "लैब पोर्टल",

    // Header & Actions
    "header.searchPlaceholder": "रिकॉर्ड, टेस्ट, दवाएं खोजें...",
    "header.help": "ग्राहक सेवा और सहायता",
    "header.themeToggle": "थीम बदलें",
    "header.language": "भाषा (Language)",

    // Landing / Navbar
    "landing.home": "मुख्य पृष्ठ",
    "landing.about": "हमारे बारे में",
    "landing.customerCare": "ग्राहक सेवा",
    "landing.features": "विशेषताएं",
    "landing.howItWorks": "यह कैसे काम करता है",
    "landing.signIn": "लॉग इन करें",
    "landing.getStarted": "शुरू करें",
    "landing.goToDashboard": "डैशबोर्ड पर जाएं",
    "landing.heroBadge": "मरीज़-नियंत्रित • प्रमाण-आधारित AI",
    "landing.heroTitle": "आपका सम्पूर्ण मेडिकल इतिहास, एक सुरक्षित वॉल्ट में",
    "landing.heroDesc": "लैब रिपोर्ट, पर्चे और स्कैन अपलोड करें। MedUnbox संरचित डेटा निकालता है, समयरेखा तैयार करता है, और डॉक्टरों को आपके वास्तविक रिकॉर्ड के आधार पर सवाल पूछने की सुविधा देता है।",
    "landing.createVault": "अपना मेडिकल वॉल्ट बनाएं",
    "landing.existingAccount": "मेरा पहले से खाता है",

    // Settings
    "settings.title": "सेटिंग्स",
    "settings.subtitle": "अपनी प्रोफ़ाइल, भाषा प्राथमिकताएं और खाता कॉन्फ़िगरेशन प्रबंधित करें",
    "settings.account": "खाता जानकारी",
    "settings.accountDesc": "आपकी प्राथमिक खाता पहचान",
    "settings.fullName": "पूरा नाम",
    "settings.email": "ईमेल पता",
    "settings.emailNotice": "ईमेल पता बदला नहीं जा सकता",
    "settings.language": "भाषा और स्थानीयकरण",
    "settings.languageDesc": "अपनी पसंदीदा भाषा चुनें। ऐप नेविगेशन और रोगी सारांश तुरंत इस भाषा में बदल जाएंगे।",
    "settings.languageHelp": "नैदानिक और लैब संदर्भों के लिए अंग्रेजी मानक है। हिंदी मरीजों के लिए सारांश और नेविगेशन को आसान बनाती है।",
    "settings.langEn": "English (अंग्रेज़ी)",
    "settings.langEnDesc": "अंतर्राष्ट्रीय नैदानिक मानक और पूर्ण चिकित्सा शब्दावली।",
    "settings.langHi": "हिन्दी (Hindi)",
    "settings.langHiDesc": "भारतीय भाषाओं में सहज समझ। रोगी सारांश और आसान नेविगेशन।",
    "settings.medicalProfile": "चिकित्सा प्रोफ़ाइल",
    "settings.medicalProfileDesc": "स्वास्थ्य सेवा प्रदाताओं के लिए वैकल्पिक जनसांख्यिकीय और आपातकालीन जानकारी",
    "settings.dob": "जन्म तिथि",
    "settings.gender": "लिंग",
    "settings.genderSelect": "लिंग चुनें",
    "settings.genderMale": "पुरुष",
    "settings.genderFemale": "महिला",
    "settings.genderOther": "अन्य",
    "settings.notSpecified": "निर्दिष्ट नहीं",
    "settings.bloodGroup": "रक्त समूह (Blood Group)",
    "settings.unknown": "अज्ञात",
    "settings.phone": "फ़ोन नंबर",
    "settings.address": "पता / शहर",
    "settings.emergencyContact": "आपातकालीन संपर्क (नाम और फ़ोन)",
    "settings.profDetails": "पेशेवर विवरण",
    "settings.profDetailsDesc": "आपका सत्यापित चिकित्सा पंजीकरण और अभ्यास विवरण",
    "settings.regNo": "पंजीकरण संख्या (MCI / राज्य परिषद)",
    "settings.specialization": "विशेषज्ञता (Specialization)",
    "settings.hospital": "अस्पताल / क्लिनिक का नाम",
    "settings.saveChanges": "बदलाव सहेजें",
    "settings.saving": "सहेजा जा रहा है...",
    "settings.saved": "सेटिंग्स सफलतापूर्वक सहेजी गईं",
    "settings.errorSave": "सेटिंग्स सहेजने में विफल। कृपया पुनः प्रयास करें।",
    "settings.dangerZone": "खतरा क्षेत्र (Danger Zone)",
    "settings.dangerDesc": "अपरिवर्तनीय और विनाशकारी खाता क्रियाएं",
    "settings.deleteAccount": "खाता हटाएं",
    "settings.deleteDesc": "अपने खाते और वॉल्ट से सभी संबंधित मेडिकल रिकॉर्ड को हमेशा के लिए मिटाएं।",

    // About Page
    "about.title": "MedUnbox के बारे में",
    "about.subtitle": "प्रमाण-आधारित AI के माध्यम से मरीजों को उनके आजीवन मेडिकल रिकॉर्ड का पूर्ण स्वामित्व देना।",
    "about.missionTitle": "हमारा उद्देश्य",
    "about.missionDesc": "भारत और दुनिया भर में स्वास्थ्य रिकॉर्ड कागज़ात, PDF और विभिन्न अस्पतालीय पोर्टलों में बिखरे हुए हैं। MedUnbox हर टेस्ट, स्कैन और पर्चे को एक सुरक्षित, मरीज़-स्वामित्व वाले रिकॉर्ड में जोड़ता है।",
    "about.pillar1Title": "मरीज़ की संप्रभुता",
    "about.pillar1Desc": "आपका डेटा आपका है। केवल आप तय करते हैं कि कौन सा डॉक्टर या अस्पताल आपके रिकॉर्ड को कितने समय के लिए देख सकता है।",
    "about.pillar2Title": "शून्य-भ्रम AI (Zero Hallucination)",
    "about.pillar2Desc": "हर सारांश और विश्लेषण मूल दस्तावेज़ पृष्ठ, पंक्ति और समय को संदर्भित करता है। कोई मनगढ़ंत दावा नहीं।",
    "about.pillar3Title": "दीर्घकालिक निरंतरता",
    "about.pillar3Desc": "कई वर्षों और कई डॉक्टरों के बीच अपने वाइटल्स, बायोमार्कर और दवाओं को निर्बाध रूप से ट्रैक करें।",
    "about.pillar4Title": "मानकीकृत अनुपालन",
    "about.pillar4Desc": "सुरक्षित और विश्वसनीय सेवा के लिए आयुष्मान भारत डिजिटल मिशन (ABDM) और DPDP अधिनियम 2023 के अनुरूप निर्मित।",

    // Customer Care
    "care.title": "ग्राहक सेवा एवं सहायता",
    "care.subtitle": "हम आपकी सहायता के लिए 24/7 उपलब्ध हैं। त्वरित उत्तर प्राप्त करें, लाइव चैट करें या सहायता टिकट दर्ज करें।",
    "care.searchPlaceholder": "सहायता लेख, दिशानिर्देश या त्रुटि कोड खोजें...",
    "care.liveChat": "लाइव सहायता चैट",
    "care.raiseTicket": "सहायता टिकट दर्ज करें",
    "care.helpline": "24/7 हेल्पलाइन",
    "care.faqs": "अक्सर पूछे जाने वाले सवाल (FAQ)",
    "care.systemStatus": "सिस्टम स्थिति",
  },
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback ?? key,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [language, setLanguageState] = useState<Language>("en")
  const [, startTransition] = useTransition()

  // Initialize from localStorage or session user locale
  useEffect(() => {
    const saved = localStorage.getItem("medunbox_lang") as Language | null
    if (saved === "en" || saved === "hi") {
      setLanguageState(saved)
      document.documentElement.lang = saved
    } else if (session?.user && "locale" in session.user) {
      const userLocale = (session.user as { locale?: string }).locale
      if (userLocale === "hi" || userLocale === "en") {
        setLanguageState(userLocale)
        document.documentElement.lang = userLocale
        localStorage.setItem("medunbox_lang", userLocale)
      }
    }
  }, [session])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("medunbox_lang", lang)
    document.documentElement.lang = lang

    // Optimistically update backend profile if user is logged in
    startTransition(() => {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      }).catch(() => {
        // Silently catch unauthenticated / network issues
      })
    })
  }

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language] || translations.en
    return langDict[key] ?? translations.en[key] ?? fallback ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
