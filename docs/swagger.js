const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const openApiPath = path.join(__dirname, 'openapi.yaml');
const spec = fs.readFileSync(openApiPath, 'utf8');

function registerSwagger(app) {
    app.get('/api/openapi.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(spec);
    });

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
        explorer: true,
        customCss: '.opblock-tag-section { display: none }',
        customSiteTitle: 'RSTC API Docs',
        customfavIcon: '/favicon.ico',
    }));
}

module.exports = { registerSwagger };
