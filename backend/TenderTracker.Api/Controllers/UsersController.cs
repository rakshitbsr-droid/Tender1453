using Microsoft.AspNetCore.Mvc;
using TenderTracker.Api.Models;
using TenderTracker.Api.Services;

namespace TenderTracker.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(TenderStore store) : ControllerBase
{
    [HttpGet]
    public IReadOnlyList<UserProfile> GetAll() => store.GetUsers();

    /// <summary>Replaces the officer directory (Masters > Officers / Groups).</summary>
    [HttpPut]
    public ActionResult<IReadOnlyList<UserProfile>> ReplaceAll(List<UserProfile> users)
    {
        if (users.Count == 0 || users.Any(u => string.IsNullOrWhiteSpace(u.Name)))
        {
            ModelState.AddModelError("users", "Every officer needs a name, and the list cannot be empty.");
            return ValidationProblem(ModelState);
        }

        return Ok(store.ReplaceUsers(users));
    }
}
