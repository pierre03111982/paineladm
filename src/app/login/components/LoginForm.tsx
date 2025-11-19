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
        
        // Se não for erro de rede ou se já tentou todas as vezes, lançar erro
        if (
          !(error instanceof FirebaseError) ||
          error.code !== "auth/network-request-failed" ||
          attempt === maxRetries
        ) {
          throw error;
        }
        
        // Log para debug
        console.log(`[LoginForm] Tentativa ${attempt + 1} falhou, tentando novamente...`, error);
      }
    }
    
    throw lastError;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!isFormValid) {
      setFormError(
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
        console.log("[LoginForm] É admin?", data.isAdmin);
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

      setSuccessMessage(
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
        
        setFormError(errorMessage);
        
        // Se for erro de rede, sugerir tentar novamente
        if (error.code === "auth/network-request-failed") {
          console.warn("[LoginForm] Erro de rede detectado. O usuário pode tentar novamente.");
        }
        
        return;
      }

      setFormError(
        "Não conseguimos acessar o serviço agora. Verifique sua conexão e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-3">
        {socialProviders.map((provider) => (
          <button
            key={provider.name}
            type="button"
            className={`flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-700/60 px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${provider.accent}`}
          >
            <span className="flex items-center gap-3">
              {provider.icon}
              <span>
                <span className="block font-semibold">{provider.name}</span>
                <span className="block text-xs opacity-80">
                  {provider.description}
                </span>
              </span>
            </span>
            <span aria-hidden className="text-xs uppercase tracking-wide">
              Em breve
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-800" />
        <span>Acesse com e-mail e senha</span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-describedby={formError ? "login-error" : undefined}
      >
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-200">
          E-mail
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
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
        />
        <p className="text-xs text-zinc-400">
          Use o e-mail corporativo ou o mesmo cadastrado no app.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-zinc-200">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="••••••••"
          value={formState.password}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, password: event.target.value }))
          }
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/40"
        />
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-indigo-500"
              checked={formState.remember}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  remember: event.target.checked,
                }))
              }
            />
            Manter conectado
          </label>
          <a
            href="#"
            className="font-medium text-indigo-300 transition hover:text-indigo-200 hover:underline"
          >
            Esqueci minha senha
          </a>
        </div>
      </div>

      {formError ? (
        <div
          id="login-error"
          role="alert"
          className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {successMessage} Redirecionando...
        </div>
      ) : null}

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:shadow-none"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-xs text-zinc-400">
          Ao continuar você concorda com os{" "}
          <a
            href="#"
            className="text-indigo-300 transition hover:text-indigo-200 hover:underline"
          >
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a
            href="#"
            className="text-indigo-300 transition hover:text-indigo-200 hover:underline"
          >
            Política de Privacidade
          </a>
          .
        </p>
      </form>
    </div>
  );
}

















