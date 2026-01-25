// Archivo de prueba para verificar variables de entorno
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Mostrar todas las variables de entorno que empiecen con GITHUB
    const githubVars = {};
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('GITHUB') || key.startsWith('VERCEL')) {
            // No mostrar el token completo por seguridad
            if (key === 'GITHUB_TOKEN') {
                githubVars[key] = process.env[key] ? `${process.env[key].substring(0, 10)}...` : 'NO DEFINIDO';
            } else {
                githubVars[key] = process.env[key] || 'NO DEFINIDO';
            }
        }
    });
    
    res.status(200).json({
        message: 'Test de variables de entorno',
        variables: githubVars,
        todasLasVariables: Object.keys(process.env).filter(k => k.startsWith('GITHUB') || k.startsWith('VERCEL'))
    });
}
