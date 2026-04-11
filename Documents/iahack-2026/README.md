# IA'Hack 2026

Repo de démarrage polyvalent pour la compétition IA'Hack 2026.

## Setup

### 1. Créer un environnement virtuel Python

```bash
python -m venv venv
```

### 2. Activer le venv

**Windows (PowerShell) :**
```powershell
venv\Scripts\Activate.ps1
```

**Windows (CMD) :**
```cmd
venv\Scripts\activate.bat
```

**Linux / macOS :**
```bash
source venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Lancer Jupyter

```bash
jupyter notebook
```

### 5. Lancer l'app (si applicable)

```bash
# FastAPI
uvicorn app.main:app --reload

# Streamlit
streamlit run app/main.py
```

## Structure

```
.
├── data/          # Données brutes et traitées
├── notebooks/     # Exploration et expérimentation
├── src/           # Code source Python
└── app/           # Application web (FastAPI / Streamlit)
```
