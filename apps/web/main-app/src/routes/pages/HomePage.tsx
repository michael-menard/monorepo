import { Link } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Search, ArrowRight, LogIn } from 'lucide-react'
import { Button } from '@repo/app-component-library'
import { selectAuth } from '@/store/slices/authSlice'

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

const itemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
}

export function HomePage() {
  const auth = useSelector(selectAuth)

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute right-[-10%] top-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/50 via-blue-500/40 to-transparent blur-3xl animate-float" />
        <div className="absolute left-[-15%] bottom-[-15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-teal-400/50 via-emerald-500/40 to-transparent blur-3xl animate-float-delayed" />
        <div className="absolute right-[10%] top-[40%] w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-cyan-500/45 via-sky-400/35 to-transparent blur-2xl animate-float" />
        <div className="absolute left-[5%] top-[25%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-green-400/45 via-lime-500/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute left-[40%] top-[5%] w-[300px] h-[300px] rounded-full bg-gradient-to-b from-blue-600/45 via-indigo-500/35 to-transparent blur-2xl animate-float" />
        <div className="absolute right-[35%] bottom-[8%] w-[350px] h-[350px] rounded-full bg-gradient-to-t from-teal-500/45 via-cyan-400/35 to-transparent blur-2xl animate-float-delayed" />
        <div className="absolute right-[25%] top-[20%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-sky-400/35 via-cyan-500/25 to-transparent blur-xl animate-float" />
        <div className="absolute left-[30%] bottom-[25%] w-[280px] h-[280px] rounded-full bg-gradient-to-tl from-emerald-400/35 via-teal-500/25 to-transparent blur-xl animate-float-delayed" />
        <div className="absolute right-[45%] top-[35%] w-[200px] h-[200px] rounded-full bg-gradient-to-br from-lime-400/30 via-green-500/20 to-transparent blur-xl animate-float" />
        <div className="absolute left-[55%] top-[60%] w-[180px] h-[180px] rounded-full bg-gradient-to-tr from-blue-400/30 via-cyan-500/20 to-transparent blur-xl animate-float-delayed" />
      </div>

      {/* Main hero content */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={containerVariants}
        className="relative z-10"
      >
        <section className="container mx-auto px-4 pt-24 pb-16 md:pt-32 md:pb-20 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="relative backdrop-blur-2xl bg-gray-500/5 dark:bg-gray-400/5 border border-white/10 dark:border-white/5 rounded-3xl p-12 md:p-16 shadow-2xl">
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-gray-400/10 dark:from-gray-300/5 dark:via-transparent dark:to-gray-500/5 rounded-3xl pointer-events-none" />
              <div className="absolute inset-0 rounded-3xl shadow-inner pointer-events-none" />

              <motion.div
                variants={itemVariants}
                className="relative z-10 text-center space-y-8"
              >
                <div className="space-y-5">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-tight">
                    Build Your{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
                      LEGO Dreams
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto text-pretty leading-relaxed">
                    Discover, organize your custom LEGO MOCs instructions, and sets. Plan your next build, track your
                    progress.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link to={auth.isAuthenticated ? '/gallery' : '/login'}>
                    <Button
                      size="lg"
                      className="gap-2 text-base h-14 px-8 w-full sm:w-auto shadow-lg transition-shadow backdrop-blur-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white border-0 cursor-pointer"
                    >
                      <Search className="w-5 h-5" />
                      Browse MOCs
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 text-base h-14 px-8 w-full sm:w-auto backdrop-blur-sm bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-2 border-pink-400 transition-shadow shadow-lg cursor-pointer"
                    >
                      <LogIn className="w-5 h-5" />
                      Login
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  )
}
