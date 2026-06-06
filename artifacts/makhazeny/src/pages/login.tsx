import { useState } from 'react'
import { useLocation } from 'wouter'
import { Warehouse } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function LoginPage() {
  const [, navigate] = useLocation()
  const { t, te } = useLanguage()
  const [email, setEmail] = useState('admin@makhazeny.local')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('Login failed')
      toast.error(te(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Warehouse className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('Makhazeny')}</CardTitle>
          <CardDescription>{t('Warehouse Management System — Sign in to continue')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('Password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('Signing in...') : t('Sign In')}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t('Default: admin@makhazeny.local / admin123')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
