"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "../../../lib/firebaseConfig";

type LoginFormState = {
  email: string;
  password: string;
  remember: boolean;
};

const initialState: LoginFormState = {
  email: "",
  password: "",
  remember: true,
};

type SocialProvider = {
  name: string;
  description: string;
  accent: string;
  icon: React.ReactElement;
};

const socialProviders: SocialProvider[] = [
  {
    name: "Google Workspace",
    description: "Acesso com conta corporativa",
    accent: "bg-white text-zinc-900 hover:bg-zinc-100",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-yellow-400 to-blue-500 text-[10px] font-bold text-white">
        G
      </span>
    ),
  },
  {
    name: "Microsoft Entra",
    description: "Integração com Azure AD",
    accent: "bg-blue-500/10 text-blue-200 hover:bg-blue-500/20",
    icon: (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/80 text-[10px] font-bold text-white">
        M
      </span>
    ),
  },
];

const firebaseErrorMessages: Record<string, string> = {
  "auth/invalid-email": "E-mail inválido. Verifique o endereço digitado.",
  "auth/invalid-credential": "Credenciais inválidas. Confira e tente novamente.",
  "auth/user-disabled":
    "Este usuário está desativado. Fale com o suporte para reativar seu acesso.",
  "auth/user-not-found":
    "Não encontramos uma conta com esse e-mail. Confirme o endereço ou peça um convite.",
  "auth/wrong-password": "Senha incorreta. Verifique ou solicite redefinição.",
  "auth/too-many-requests":
    "Recebemos muitas tentativas de login. Aguarde alguns instantes antes de tentar novamente.",
  "auth/network-request-failed":
    "Erro de conexão. Verificando conexão e tentando novamente...",
};

type LoginFormProps = {
  redirectPath?: string;
};

export function LoginForm({ redirectPath }: LoginFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<LoginFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isValidEmail = useMemo(() => {
    if (!formState.email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email);
  }, [formState.email]);

  const isFormValid = formState.password.trim().length >= 6 && isValidEmail;

  // Função auxiliar para aguardar o Firebase Auth estar pronto
  const waitForAuthReady = (): Promise<void> => {
    return new Promise((resolve) => {
      // Verificar se o Auth já está inicializado
      if (firebaseAuth && firebaseAuth.app) {
        // Aguardar um pequeno delay para garantir que está totalmente pronto
        setTimeout(() => resolve(), 100);
        return;
      }
      
      // Se não estiver pronto, aguardar o evento de inicialização
      const unsubscribe = firebaseAuth.onAuthStateChanged(() => {
        unsubscribe();
        resolve();
      });
      
      // Timeout de segurança (1 segundo)
      setTimeout(() => {
        unsubscribe();
        resolve();
      }, 1000);
    });
  };

  // Função com retry automático
  const signInWithRetry = async (
    email: string,
    password: string,
    maxRetries = 2
  ) => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Aguardar Firebase estar pronto
        await waitForAuthReady();
        
        // Pequeno delay adicional para garantir inicialização completa
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }
        
        const credentials = await signInWithEmailAndPassword(
          firebaseAuth,
          email,
          password
        );
        
        return credentials;
      } catch (error) {
        lastError = error as Error;

        const code = (error as any)?.code;

        // Só repetir automaticamente para erro de rede do Firebase
        const isNetworkError =
          typeof code === "string" && code === "auth/network-request-failed";

        if (!isNetworkError || attempt === maxRetries) {
          throw error;
        }

        // Log para debug
        console.log(
          `[LoginForm] Tentativa ${attempt + 1} falhou com erro de rede, tentando novamente...`,
          error
        );
      }
    }
    
    throw lastError;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isFormValid) {
      // Temporarily use console.error for feedback after removing messages
      console.error(
        "Preencha um e-mail válido e uma senha com pelo menos 6 caracteres."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const credentials = await signInWithRetry(
        formState.email,
        formState.password
      );

      // Obter token do Firebase
      const token = await credentials.user.getIdToken();
      const userEmail = credentials.user.email;

      // Sempre verificar se o usuário é admin após login
      let isAdmin = false;
      let finalRedirectPath = redirectPath || "/dashboard";

      try {
        const response = await fetch("/api/auth/check-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        console.log("[LoginForm] Resposta check-admin:", JSON.stringify(data, null, 2));
        console.log("[LoginForm] É admin?"), data.isAdmin;
        console.log("[LoginForm] Email verificado:", data.email);

        isAdmin = data.isAdmin === true;

        // Se for admin, redirecionar para /admin (ou manter redirectPath se for uma rota admin)
        if (isAdmin) {
          finalRedirectPath = redirectPath?.startsWith("/admin") ? redirectPath : "/admin";
        } else {
          // Se não for admin, redirecionar para /dashboard (ou manter redirectPath se não for rota admin)
          finalRedirectPath = redirectPath && !redirectPath.startsWith("/admin") ? redirectPath : "/dashboard";
        }

        // Definir cookies de autenticação
        const setTokenResponse = await fetch("/api/auth/set-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, isAdmin }),
        });
        
        const setTokenData = await setTokenResponse.json();
        console.log("[LoginForm] Cookies definidos:", setTokenData);
        console.log("[LoginForm] Redirecionando para:", finalRedirectPath);
      } catch (error) {
        console.error("[LoginForm] Erro ao verificar admin:", error);
        // Em caso de erro, assumir que não é admin e redirecionar para dashboard
        isAdmin = false;
        finalRedirectPath = "/dashboard";
        
        // Ainda assim, definir o token para permitir acesso ao painel lojista
        await fetch("/api/auth/set-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, isAdmin: false }),
        });
      }

      console.log(
        `Bem-vindo de volta, ${userEmail ?? ""}! Redirecionando para ${isAdmin ? "painel administrativo" : "painel do lojista"}...`
      );

      setTimeout(() => {
        router.push(finalRedirectPath);
      }, 800);
    } catch (error) {
      console.error("[LoginForm] Erro no login:", error);

      if (error instanceof FirebaseError) {
        const errorMessage = firebaseErrorMessages[error.code] ?? 
          "Não foi possível autenticar agora. Tente novamente em breve.";
        
        console.error(errorMessage); // Use console.error for feedback
        
        // Se for erro de rede, sugerir tentar novamente
        if (error.code === "auth/network-request-failed") {
          console.warn("[LoginForm] Erro de rede detectado. O usuário pode tentar novamente.");
        }
        
        return;
      }

      console.error(
        "Não conseguimos acessar o serviço agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        {socialProviders.map((provider) => (
          <button
            key={provider.name}
            type="button"
            className={`flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-700/60 px-3 py-1.5 text-left text-xs transition hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${provider.accent}`}
          >
            <span className="flex items-center gap-3">
              <div className="scale-90">{provider.icon}</div>
              <span>
                <span className="block font-semibold leading-none">{provider.name}</span>
                <span className="block text-[9px] opacity-70 mt-0.5">
                  {provider.description}
                </span>
              </span>
            </span>
            <span aria-hidden className="text-[9px] uppercase tracking-wide opacity-50 font-medium">
              Em breve
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
        <span className="h-px flex-1 bg-white/5" />
        <span>E-mail</span>
        <span className="h-px flex-1 bg-white/5" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-describedby={formError ? "login-error" : undefined}
      >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-zinc-400 ml-1">
          E-mail Corporativo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@empresa.com"
          value={formState.email}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, email: event.target.value }))
          }
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none backdrop-blur-sm transition focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-0"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="password" className="text-xs font-semibold text-zinc-400">
            Senha de Acesso
          </label>
          <a
            href="#"
            className="text-[10px] font-medium text-indigo-400/80 transition hover:text-indigo-300 hover:underline"
          >
            Esqueci minha senha
          </a>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={6}
            placeholder="••••••••"
            value={formState.password}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, password: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 pr-10 text-sm text-zinc-100 placeholder-zinc-600 outline-none backdrop-blur-sm transition focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-0"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-zinc-300 transition"
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.879 16.121A4.995 4.995 0 0112 15c1.464 0 2.8-.574 3.795-1.528A4.977 4.977 0 0017 12c0-1.464-.574-2.8-1.528-3.795M21 21l-9-9M3 3l9 9" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/20 transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
        >
          {isSubmitting ? "AUTENTICANDO..." : "ENTRAR NO SISTEMA"}
        </button>

        <p className="text-center text-[9px] text-zinc-600 leading-tight">
          Ao autenticar, você confirma ciência dos{" "}
          <a href="#" className="text-zinc-500 hover:text-indigo-400 underline decoration-zinc-700">Termos</a>{" "}
          e da{" "}
          <a href="#" className="text-zinc-500 hover:text-indigo-400 underline decoration-zinc-700">Privacidade</a>.
        </p>
      </form>
    </div>
  );
}

















