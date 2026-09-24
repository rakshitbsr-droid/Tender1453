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
        if (!(tender.EstimateValueCr > 0))
            ModelState.AddModelError("estimate_value_cr", "Estimate value must be greater than zero.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        // Explicit JSON nulls bypass the property initialisers
        var saved = store.Add(tender with
        {
            AttachedPms = tender.AttachedPms ?? [],
            AttachedFms = tender.AttachedFms ?? [],
            AttachedCecOfficers = tender.AttachedCecOfficers ?? [],
            DaysByRole = tender.DaysByRole ?? new DaysByRole(),
            Timeline = tender.Timeline ?? [],
        });

        return CreatedAtAction(nameof(Get), new { srNo = saved.SrNo }, saved);
    }

    [HttpPost("{srNo:int}/advance")]
    public ActionResult<Tender> Advance(int srNo, AdvanceStageRequest request)
    {
        if (!TenderWorkflow.Stages.Contains(request.NextStage))
            ModelState.AddModelError("next_stage", $"'{request.NextStage}' is not a valid stage.");
        if (!TenderWorkflow.Roles.Contains(request.NextRole))
            ModelState.AddModelError("next_role", $"'{request.NextRole}' is not a valid role.");
        if (string.IsNullOrWhiteSpace(request.NextHolder))
            ModelState.AddModelError("next_holder", "A recipient officer is required.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var updated = store.Update(srNo, t => TenderWorkflow.Advance(t, request, DateTime.Now));
        return updated is null ? NotFound() : updated;
    }
}
