# Builds and runs the API. Used by Render (see render.yaml at the repo root), Railway, Fly.io or plain Docker:
#   docker build -t tender-api backend/TenderTracker.Api && docker run -p 8080:8080 tender-api
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY TenderTracker.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Hosts that assign a port set PORT; Program.cs listens on it. Otherwise 8080.
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "TenderTracker.Api.dll"]
