import app from './app';

const PORT = Number.parseInt(process.env.BACKEND_PORT ?? '4000', 10);

app.listen(PORT, () => {
  console.log(`TCG backend listening on port ${PORT}`);
});
