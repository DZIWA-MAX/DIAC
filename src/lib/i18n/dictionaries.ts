export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

export const dictionaries = {
  pt: {
    nav: {
      home: "Início",
      features: "Recursos",
      security: "Segurança",
      plans: "Planos",
      faq: "FAQ",
      login: "Entrar",
      register: "Criar conta",
    },
    hero: {
      title: "Sua nuvem pessoal, simples e segura.",
      subtitle: "Armazene, organize e compartilhe seus arquivos de qualquer lugar.",
      ctaPrimary: "Começar gratuitamente",
      ctaSecondary: "Ver planos",
    },
    benefits: {
      title: "Tudo o que você precisa em uma nuvem",
      subtitle: "Recursos pensados para simplicidade, segurança e crescimento.",
      secureTitle: "Armazenamento seguro",
      secureDesc: "Seus arquivos protegidos por autenticação e controles de acesso.",
      anywhereTitle: "Acesso em qualquer lugar",
      anywhereDesc: "Acesse seus arquivos pelo computador, tablet ou celular.",
      shareTitle: "Compartilhamento fácil",
      shareDesc: "Compartilhe arquivos através de links seguros.",
      orgTitle: "Organização simples",
      orgDesc: "Pastas, favoritos, pesquisa e arquivos recentes.",
      privacyTitle: "Privacidade",
      privacyDesc: "Cada usuário possui seu próprio espaço privado.",
      scaleTitle: "Escalabilidade",
      scaleDesc: "Arquitetura preparada para crescer junto com o negócio.",
    },
    footer: {
      tagline: "Seus arquivos. Sua nuvem. Sua liberdade.",
      rights: "Todos os direitos reservados.",
    },
    auth: {
      loginTitle: "Entrar na sua conta",
      registerTitle: "Criar sua conta gratuita",
      name: "Nome",
      email: "Email",
      password: "Senha",
      confirmPassword: "Confirmar senha",
      rememberMe: "Permanecer conectado",
      forgotPassword: "Esqueceu a senha?",
      loginButton: "Entrar",
      registerButton: "Criar conta",
      haveAccount: "Já tem uma conta?",
      noAccount: "Ainda não tem uma conta?",
      agreeTerms: "Eu concordo com os Termos de Uso e a Política de Privacidade",
    },
  },
  en: {
    nav: {
      home: "Home",
      features: "Features",
      security: "Security",
      plans: "Plans",
      faq: "FAQ",
      login: "Log in",
      register: "Sign up",
    },
    hero: {
      title: "Your personal cloud, simple and secure.",
      subtitle: "Store, organize and share your files from anywhere.",
      ctaPrimary: "Start for free",
      ctaSecondary: "View plans",
    },
    benefits: {
      title: "Everything you need in a cloud",
      subtitle: "Features built for simplicity, security and growth.",
      secureTitle: "Secure storage",
      secureDesc: "Your files protected by authentication and access controls.",
      anywhereTitle: "Access anywhere",
      anywhereDesc: "Reach your files from your computer, tablet or phone.",
      shareTitle: "Easy sharing",
      shareDesc: "Share files through secure links.",
      orgTitle: "Simple organization",
      orgDesc: "Folders, favorites, search and recent files.",
      privacyTitle: "Privacy",
      privacyDesc: "Every user has their own private space.",
      scaleTitle: "Scalability",
      scaleDesc: "Architecture built to grow alongside the business.",
    },
    footer: {
      tagline: "Your files. Your cloud. Your freedom.",
      rights: "All rights reserved.",
    },
    auth: {
      loginTitle: "Sign in to your account",
      registerTitle: "Create your free account",
      name: "Name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      rememberMe: "Keep me signed in",
      forgotPassword: "Forgot password?",
      loginButton: "Log in",
      registerButton: "Create account",
      haveAccount: "Already have an account?",
      noAccount: "Don't have an account yet?",
      agreeTerms: "I agree to the Terms of Use and Privacy Policy",
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
