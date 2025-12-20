function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          SADO POC
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Proof of Concept Project
        </p>
        <div className="p-8 bg-card text-card-foreground rounded-lg shadow-lg">
          <p className="text-muted-foreground">프로젝트 시작 준비 완료</p>
        </div>
      </div>
    </div>
  )
}

export default App
