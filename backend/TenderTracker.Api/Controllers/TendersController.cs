using Microsoft.AspNetCore.Mvc;
using TenderTracker.Api.Models;
using TenderTracker.Api.Services;

namespace TenderTracker.Api.Controllers;

[ApiController]
[Route("api/tenders")]
public sealed class TendersController(TenderStore store) : ControllerBase
{
    [HttpGet]
    public IReadOnlyList<Tender> GetAll() => store.GetAll();

    [HttpGet("{srNo:int}")]
    public ActionResult<Tender> Get(int srNo)
    {
        var tender = store.Get(srNo);
        return tender is null ? NotFound() : tender;
    }

    [HttpPost]
    public ActionResult<Tender> Create(Tender tender)
    {
        if (string.IsNullOrWhiteSpace(tender.PrNo))
            ModelState.AddModelError("pr_no", "PR No is required.");
        if (string.IsNullOrWhiteSpace(tender.ItemDescription))
            ModelState.AddModelError("item_description", "Item description is required.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var saved = store.Add(WithoutNulls(tender));

        return CreatedAtAction(nameof(Get), new { srNo = saved.SrNo }, saved);
    }

    /// <summary>
    /// Saves a tender as the frontend computed it: stage hand-offs, evaluation movements, cancellation,
    /// post-award steps and edits all arrive here (the rules live in src/App.tsx and tenderUtils.ts).
    /// </summary>
    [HttpPut("{srNo:int}")]
    public ActionResult<Tender> Replace(int srNo, Tender tender)
    {
        if (string.IsNullOrWhiteSpace(tender.PrNo))
            ModelState.AddModelError("pr_no", "PR No is required.");
        if (string.IsNullOrWhiteSpace(tender.ItemDescription))
            ModelState.AddModelError("item_description", "Item description is required.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var updated = store.Update(srNo, _ => WithoutNulls(tender) with { SrNo = srNo });
        return updated is null ? NotFound() : updated;
    }

    // Explicit JSON nulls bypass the property initialisers
    private static Tender WithoutNulls(Tender tender) => tender with
    {
        AttachedPms = tender.AttachedPms ?? [],
        AttachedFms = tender.AttachedFms ?? [],
        AttachedCecOfficers = tender.AttachedCecOfficers ?? [],
        DaysByRole = tender.DaysByRole ?? new DaysByRole(),
        Timeline = tender.Timeline ?? [],
    };
}
