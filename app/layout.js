import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";

// Body font
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter", 
});

// Heading font
const montserrat = Montserrat({ 
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata = {
  title: "Lingua",
  description:
    "An AI-powered language learning platform that lets you practice conversations and receives personalized feedback to improve your skills.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Inject both font variables into the body className */}
      <body className={`${inter.variable} ${montserrat.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Header */}
          <Header />
        {/* Added pt-16 (4rem / 64px) to match the h-16 height of header */}
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      
       

          {/* Footer */}
          <footer className="bg-muted/50 ">
            <div className="container mx-auto px-4 h-1 text-xs text-center text-gray-400">
              <p>Made by Kailash Shankar</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}