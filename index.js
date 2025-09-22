import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const port = 3000;

const db = new pg.Client({
	user: 'postgres',
	host: 'localhost',
	database: 'worldz',
	password: '123456',
	port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

async function checkVisisted() {
	const result = await db.query('SELECT country_code FROM visited_countries');
	let countries = [];
	result.rows.forEach((country) => {
		countries.push(country.country_code);
	});
	return countries;
}

app.get('/', async (req, res) => {
	const countries = await checkVisisted();
	res.render('index.ejs', { countries: countries, total: countries.length });
});

app.post('/add', async (req, res) => {
	const input = req.body['country'];

	if (!input || input.trim() === '') {
		const countries = await checkVisisted();
		return res.render('index.ejs', {
			countries: countries,
			total: countries.length,
			error: 'Por favor, digite o nome de um país antes de adicionar.',
		});
	}

	const normalizedInput = input.trim().toLowerCase();
	let result;

	try {
		result = await db.query(
			'SELECT country_code FROM countries WHERE LOWER(country_name) = $1;',
			[normalizedInput]
		);

		if (result.rows.length === 0) {
			result = await db.query(
				"SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
				[normalizedInput]
			);
		}

		if (result.rows.length === 0) {
			const countries = await checkVisisted();
			return res.render('index.ejs', {
				countries: countries,
				total: countries.length,
				error: 'O nome desse país não existe, tente outro novamente.',
			});
		}

		const countryCode = result.rows[0].country_code;

		try {
			await db.query(
				'INSERT INTO visited_countries (country_code) VALUES ($1)',
				[countryCode]
			);
			res.redirect('/');
		} catch (err) {
			console.log('Erro ao inserir país:', err);
			const countries = await checkVisisted();
			res.render('index.ejs', {
				countries: countries,
				total: countries.length,
				error: 'Esse país já foi adicionado, tente outro novamente.',
			});
		}
	} catch (err) {
		console.log('Erro na busca SQL:', err);
		const countries = await checkVisisted();
		res.render('index.ejs', {
			countries: countries,
			total: countries.length,
			error: 'Erro ao buscar país. Tente novamente.',
		});
	}

	console.log('Input recebido:', input);
});

app.post('/limpar', async (req, res) => {
	try {
		await db.query('DELETE FROM visited_countries');
		res.redirect('/');
	} catch (err) {
		console.error('Erro ao limpar países:', err);
		const countries = await checkVisisted();
		res.render('index.ejs', {
			countries: countries,
			total: countries.length,
			error: 'Erro ao limpar países. Tente novamente.',
		});
	}
});

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
