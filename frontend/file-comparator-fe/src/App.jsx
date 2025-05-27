import { Trash2 } from 'lucide-react';        // ikona kosza
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Sheet, SheetTrigger, SheetContent } from "./components/ui/sheet";
import { Upload, LogOut, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { compareFiles, saveComparison, login, register, getMyComparisons, deleteComparison } from "./api";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import "highlight.js/styles/github.css";

// ----------------------- wspólne komponenty UI -----------------------
const Container = ({ children }) => (
  <div className="max-w-5xl w-full mx-auto px-4 py-10 sm:py-14 lg:py-16">{children}</div>
);

const Navbar = ({ token, onLogout }) => (
  <nav className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
    <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
      <Link to="/" className="text-xl font-extrabold tracking-tight">
        TextMatch
      </Link>
      <div className="flex items-center gap-4">
        {token && (
          <>
            <Link
              to="/my-files"
              className="text-sm font-medium hover:underline flex items-center gap-1"
            >
              <FileText size={16} /> Moje pliki
            </Link>
            <Button variant="ghost" size="sm" onClick={onLogout} className="flex items-center gap-1">
              <LogOut size={16} /> Wyloguj
            </Button>
          </>
        )}
      </div>
    </div>
  </nav>
);

// ----------------------- LOGOWANIE / REJESTRACJA -----------------------
function Auth({ setToken, setUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (isRegister) {
      const data = await register(form.username, form.email, form.password);
      if (data.message) {
        alert("Rejestracja udana! Możesz się zalogować.");
        setIsRegister(false);
      } else {
        alert("Rejestracja nieudana");
      }
    } else {
      const data = await login(form.username, form.password);
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
      } else {
        alert("Logowanie nieudane");
      }
    }
  };

  return (
    <Container>
      <Card className="mx-auto max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            {isRegister ? "Rejestracja" : "Logowanie"}
            {isRegister ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
              {isRegister ? (
     <>
       <div className="space-y-1">
         <Label>Nazwa Użytkownika</Label>
         <Input
           name="username"
           placeholder="admin"
           value={form.username}
           onChange={handleChange}
         />
       </div>
       <div className="space-y-1">
         <Label>Email</Label>
         <Input
           name="email"
           type="email"
           placeholder="admin@example.com"
           value={form.email}
           onChange={handleChange}
         />
       </div>
     </>
   ) : (
     <div className="space-y-1">
       <Label>Nazwa Użytkownika</Label>
       <Input
         name="username"
         placeholder="admin"
         value={form.username}
         onChange={handleChange}
       />
     </div>
   )}
   <div className="space-y-1">
     <Label>Hasło</Label>
     <Input
       name="password"
       type="password"
       placeholder="********"
       value={form.password}
       onChange={handleChange}
     />
   </div>
            <Button type="submit" className="w-full mt-2">
              {isRegister ? "Zarejestruj" : "Zaloguj"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm underline text-gray-600 hover:text-gray-900"
          >
            {isRegister ? "Masz już konto? Zaloguj się" : "Nie masz konta? Zarejestruj się"}
          </button>
        </CardFooter>
      </Card>
    </Container>
  );
}

// ----------------------- PORÓWNYWANIE PLIKÓW -----------------------
function Compare({ token }) {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [htmlDiff, setHtmlDiff] = useState("");
  const [textDiff, setTextDiff] = useState("");
  const [filenames, setFilenames] = useState({ filename1: "", filename2: "" });
  const [noDiffMsg, setNoDiffMsg] = useState("");

  const handleCompare = async () => {
    if (!file1 || !file2) return alert("Wybierz dwa pliki");
    setHtmlDiff("");
    setTextDiff("");
    setNoDiffMsg("");
    try {
      const { filename1, filename2, diff } = await compareFiles(token, file1, file2);
      setFilenames({ filename1, filename2 });
      setTextDiff(diff);
      if (!diff) {
        setNoDiffMsg("Brak różnic między plikami");
        return;
      }
      const generatedHtml = diff2html(diff, {
        drawFileList: true,
        matching: "lines",
        outputFormat: "side-by-side",
      });
      setHtmlDiff(generatedHtml);
    } catch (e) {
      console.error(e);
      alert(`Porównanie nieudane: ${e.message}`);
    }
  };

  const handleSave = async () => {
    if (!textDiff) return alert("Brak wyników do zapisania");
    try {
      await saveComparison(token, filenames.filename1, filenames.filename2, textDiff);
      alert("Zapisano!");
    } catch (e) {
      console.error(e);
      alert(`Zapis nieudany: ${e.message}`);
    }
  };

  return (
    <Container>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            Porównaj pliki <Upload size={20} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input type="file" onChange={(e) => setFile1(e.target.files[0])} />
            <Input type="file" onChange={(e) => setFile2(e.target.files[0])} />
            <Button onClick={handleCompare} className="whitespace-nowrap">Porównaj</Button>
          </div>

          {noDiffMsg && <p className="text-center text-sm text-gray-600">{noDiffMsg}</p>}

          {htmlDiff && (
            <div className="border rounded-xl shadow-inner overflow-x-auto" dangerouslySetInnerHTML={{ __html: htmlDiff }} />
          )}
        </CardContent>
        {textDiff && (
          <CardFooter className="flex justify-end">
            <Button variant="secondary" onClick={handleSave}>Zapisz wynik</Button>
          </CardFooter>
        )}
      </Card>
    </Container>
  );
}

// ----------------------- MOJE PORÓWNANIA -----------------------
function MyComparisons({ token }) {
  const [files, setFiles] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    getMyComparisons(token).then(setFiles).catch(console.error);
  }, [token]);

  const makeHtml = (diffText) =>
    diffText
      ? diff2html(diffText, {
          drawFileList: true,
          matching: "lines",
          outputFormat: "side-by-side",
        })
      : '<p class="text-sm text-gray-600">Brak różnic w tym porównaniu.</p>';

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  /* --- NOWA funkcja usuwania --- */
  const remove = async (id) => {
    if (!window.confirm("Na pewno usunąć to porównanie?")) return;
    try {
      await deleteComparison(token, id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error(e);
      alert("Delete failed: " + e.message);
    }
  };

  return (
    <Container>
      <h2 className="text-2xl font-bold mb-6">Moje porównania</h2>
      <div className="space-y-4">
        {files.map((file) => {
          const isOpen = file.id === openId;
          return (
            <Card key={file.id} className="shadow-md">
              {/* ---------- nagłówek z dwoma przyciskami ---------- */}
              <div className="flex items-center justify-between p-4">
                {/* klik na tytuł = toggle */}
                <button
                  onClick={() => toggle(file.id)}
                  className="flex items-center gap-2 flex-1 text-left font-medium"
                >
                  <span>
                    {file.filename1} vs {file.filename2}
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({new Date(file.created_at).toLocaleString()})
                    </span>
                  </span>
                  <span className="text-lg">{isOpen ? "▾" : "▸"}</span>
                </button>

                {/* przycisk kasowania */}
                <button
                  onClick={() => remove(file.id)}
                  title="Usuń porównanie"
                  className="p-1.5 rounded hover:bg-red-50"
                >
                  <Trash2 size={18} className="text-red-600" />
                </button>
              </div>

              {/* ---------- zawartość diff‑a ---------- */}
              {isOpen && (
                <CardContent>
                  <div
                    className="border rounded-lg overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: makeHtml(file.diff) }}
                  />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </Container>
  );
}

// ----------------------- ROOT APP -----------------------
function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setToken("");
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-100 to-slate-50 text-gray-900">
        <Navbar token={token} onLogout={handleLogout} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={!token ? <Auth setToken={setToken} setUser={setUser} /> : <Compare token={token} />} />
            <Route path="/my-files" element={token ? <MyComparisons token={token} /> : <Navigate to="/" />} />
          </Routes>
        </main>
        <footer className="text-center text-xs py-4 text-gray-500 border-t bg-white/70 backdrop-blur">
          © {new Date().getFullYear()} TextMatch — Wszystkie prawa zastrzeżone
        </footer>
      </div>
    </Router>
  );
}

export default App;