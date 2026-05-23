import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Scale, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "登录 — LawLink"
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-1 gap-16 lg:grid-cols-2">
      {/* 左侧：品牌区 —— editorial */}
      <div className="hidden flex-col justify-between lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-ll-low">
            <Scale className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <div className="font-display text-[1.5rem] font-medium leading-none tracking-tight">
              LawLink
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground/80">律师工作台</div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="text-[11px] text-primary/85">{new Date().getFullYear()}</div>
            <h2 className="font-display text-[3.2rem] font-medium leading-[1.05] tracking-tight">
              把精力放在
              <br />
              <span className="italic">案件本身</span>，
              <br />
              而不是表格里。
            </h2>
            <div className="ll-rule-accent" />
          </div>

          <ul className="space-y-4 text-[0.92rem] text-muted-foreground">
            <Feature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              数据自托管，附件可选加密，不依赖第三方 SaaS
            </Feature>
            <Feature icon={<Sparkles className="h-3.5 w-3.5" />}>
              覆盖收案、冲突检索、多程序串接、财务分成、归档全流程
            </Feature>
            <Feature icon={<Scale className="h-3.5 w-3.5" />}>
              规范案由库（民商事 / 刑事 / 行政）从源头消除字符串歧义
            </Feature>
          </ul>
        </div>

        <div className="text-[11px] text-muted-foreground/70">
          MIT 协议 · 自主部署 · <span className="font-mono">v0.8.0</span>
        </div>
      </div>

      {/* 右侧：登录卡 */}
      <div className="ll-surface flex flex-col justify-center p-10 lg:p-12">
        <div className="mb-8">
          <div className="text-[11px] text-muted-foreground">登录</div>
          <h1 className="mt-2 font-display text-[2rem] font-medium tracking-tight">
            欢迎回来
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            用您的工作邮箱登录
          </p>
        </div>

        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex h-40 items-center justify-center text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/8 text-primary">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}
