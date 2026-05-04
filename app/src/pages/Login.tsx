import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      navigate("/dashboard");
    },
    onError: (error) => {
      setError(error.message);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-16 w-16 rounded-xl bg-[var(--primary)] flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 339 328" className="w-12 h-12">
                <g transform="translate(0,328) scale(0.1,-0.1)" fill="#141414" stroke="none" strokeWidth="25" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M1585 2968 c-88 -61 -205 -143 -260 -182 -55 -39 -295 -204 -533 -366 l-431 -295 -1 -382 0 -383 30 0 30 0 0 359 0 359 403 278 c221 153 521 360 665 460 l264 182 96 -67 c140 -98 1031 -714 1135 -785 l87 -60 0 -753 0 -753 35 0 35 0 0 769 0 770 -292 204 c-459 319 -1094 757 -1100 757 -2 0 -75 -50 -163 -112z M652 1492 l-454 -448 74 -72 73 -71 48 47 47 46 0 -382 0 -382 1385 0 c762 0 1385 3 1385 6 0 4 -169 253 -375 555 l-375 549 55 76 c31 41 58 81 61 88 2 6 -7 22 -21 34 l-25 22 -50 -75 c-28 -41 -54 -75 -58 -75 -4 1 -30 34 -57 74 l-50 74 -28 -24 -27 -23 60 -85 61 -85 -158 -229 c-87 -126 -221 -323 -298 -439 -77 -116 -142 -212 -145 -212 -3 -1 -4 117 -2 261 1 145 2 266 2 270 0 4 20 -14 44 -40 l44 -46 77 69 78 69 -454 448 c-250 246 -456 447 -459 447 -3 0 -209 -201 -458 -447z m868 -56 c379 -379 399 -401 383 -418 -9 -10 -20 -18 -26 -18 -5 0 -180 169 -388 376 l-378 376 -365 -362 c-201 -200 -375 -370 -387 -378 -19 -13 -23 -12 -42 7 l-22 22 405 399 c223 219 408 398 412 397 4 -1 188 -182 408 -401z m-253 62 c35 -34 63 -65 63 -68 0 -3 -99 -5 -220 -5 -121 0 -220 2 -220 5 0 3 26 31 58 62 l57 57 90 4 c50 1 94 4 100 5 5 1 38 -26 72 -60z m208 -208 l69 -70 -434 0 -434 0 69 70 69 70 296 0 296 0 69 -70z m1123 -272 c364 -532 482 -707 482 -712 0 -3 -82 -6 -182 -6 l-183 1 -74 167 c-41 92 -105 235 -143 319 l-68 152 0 155 c0 86 2 156 4 156 3 0 76 -105 164 -232z m-238 -127 c-12 -31 -69 -176 -128 -324 l-106 -267 -184 0 c-143 0 -183 3 -179 13 5 12 129 196 441 651 l171 250 3 -133 c2 -115 0 -141 -18 -190z m-688 202 c32 -32 58 -61 58 -65 0 -10 -1224 -11 -1234 -1 -3 4 20 34 53 67 l60 61 503 -3 503 -2 57 -57z m-244 -463 l-3 -331 -115 -2 c-104 -1 -115 0 -114 16 1 9 2 159 3 332 l1 315 115 0 115 0 -2 -330z m-728 265 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-570 -125 l0 -160 -85 0 -85 0 0 -30 0 -30 85 0 85 0 0 -127 0 -128 -175 0 -175 0 0 318 0 317 175 0 175 0 0 -160z m-430 -65 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-1000 -170 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-1000 -175 l0 -60 -100 0 -100 0 0 60 0 60 100 0 100 0 0 -60z m1000 18 c0 -67 -17 -78 -122 -78 l-88 0 0 60 0 60 105 0 105 0 0 -42z"/>
                </g>
              </svg>
          </div>
          <h1 className="text-2xl font-bold font-serif text-[var(--foreground)]">Native Resort & Camping</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Guides . Cuisines . Events</p>
        </div>

        <Card className="border-[var(--border)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md animate-in fade-in duration-300">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@nativeresort.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
