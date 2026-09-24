using Microsoft.AspNetCore.Mvc;
using TenderTracker.Api.Models;
using TenderTracker.Api.Services;

namespace TenderTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(TenderStore store) : ControllerBase
{
    [HttpGet]
    public IReadOnlyList<UserProfile> GetAll() => store.Users;
}
