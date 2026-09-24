using TenderTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Hosts such as Render and Railway tell the app which port to use through PORT.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port)) builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Models carry explicit [JsonPropertyName]s, so no naming policy is applied.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = null);
builder.Services.AddSingleton<TenderStore>();

// The hosted frontend (Vercel) lives on another origin. Cors:AllowedOrigins (env Cors__AllowedOrigins,
// comma-separated) restricts who may call the API; when it is unset any site may, which suits a demo.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    if (allowedOrigins.Length > 0) policy.WithOrigins(allowedOrigins);
    else policy.AllowAnyOrigin();
    policy.AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();

// Load seed/persisted data at startup so a bad data file fails fast, not on first request.
app.Services.GetRequiredService<TenderStore>();

app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();
